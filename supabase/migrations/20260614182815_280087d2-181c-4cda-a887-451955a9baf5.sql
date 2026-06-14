
-- 1) rate_limits table (service-role only)
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  function_name text NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ip, function_name)
);

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies — only service_role (bypasses RLS) and SECURITY DEFINER
-- functions can touch this table. This is intentional.

CREATE INDEX rate_limits_lookup_idx ON public.rate_limits (ip, function_name);

-- 2) Atomic check + increment helper (used by edge functions and triggers)
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_ip text,
  p_function text,
  p_max integer,
  p_window interval
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  IF p_ip IS NULL OR length(trim(p_ip)) = 0 THEN
    p_ip := 'unknown';
  END IF;

  INSERT INTO public.rate_limits (ip, function_name, request_count, window_start, updated_at)
  VALUES (p_ip, p_function, 1, now(), now())
  ON CONFLICT (ip, function_name) DO UPDATE
  SET
    request_count = CASE
      WHEN public.rate_limits.window_start < (now() - p_window) THEN 1
      ELSE public.rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN public.rate_limits.window_start < (now() - p_window) THEN now()
      ELSE public.rate_limits.window_start
    END,
    updated_at = now()
  RETURNING request_count, window_start INTO v_count, v_window_start;

  RETURN v_count <= p_max;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, text, integer, interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, text, integer, interval) TO service_role;

-- 3) Trigger on leads: max 3 INSERTs per IP per hour
CREATE OR REPLACE FUNCTION public.enforce_leads_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers text;
  v_ip text;
  v_allowed boolean;
BEGIN
  -- PostgREST exposes request headers via this GUC. May be missing for
  -- service-role / SQL-editor calls — in that case we skip the limit.
  BEGIN
    v_headers := current_setting('request.headers', true);
  EXCEPTION WHEN OTHERS THEN
    v_headers := NULL;
  END;

  IF v_headers IS NULL OR length(v_headers) = 0 THEN
    RETURN NEW;
  END IF;

  v_ip := COALESCE(
    split_part(v_headers::json ->> 'x-forwarded-for', ',', 1),
    v_headers::json ->> 'cf-connecting-ip',
    v_headers::json ->> 'x-real-ip'
  );
  v_ip := nullif(trim(v_ip), '');

  IF v_ip IS NULL THEN
    RETURN NEW;
  END IF;

  v_allowed := public.check_and_increment_rate_limit(v_ip, 'leads_insert', 3, interval '1 hour');

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'rate_limit_exceeded: too many submissions from this IP, please try again later'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_rate_limit_trg
BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.enforce_leads_rate_limit();
