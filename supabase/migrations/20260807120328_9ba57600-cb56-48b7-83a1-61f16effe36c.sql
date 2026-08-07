CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.normalize_expired_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.assinaturas
  SET status = 'expirado', updated_at = now()
  WHERE status = 'trial'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_expired_trials() FROM anon, authenticated;

SELECT cron.unschedule('normalize-expired-trials')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'normalize-expired-trials');

SELECT cron.schedule(
  'normalize-expired-trials',
  '10 * * * *',
  $$SELECT public.normalize_expired_trials();$$
);