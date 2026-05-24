-- Monitoring config (one per user/url)
CREATE TABLE public.llms_monitoring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  monitored_url text NOT NULL,
  frequency text NOT NULL DEFAULT 'weekly',
  email_alerts boolean NOT NULL DEFAULT true,
  alert_email text NOT NULL DEFAULT '',
  paused boolean NOT NULL DEFAULT false,
  last_check_at timestamptz,
  next_check_at timestamptz NOT NULL DEFAULT now(),
  last_site_hash text,
  last_llms_hash text,
  llms_present boolean,
  alerts_sent integer NOT NULL DEFAULT 0,
  pending_alert boolean NOT NULL DEFAULT false,
  pending_alert_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT llms_monitoring_frequency_check CHECK (frequency IN ('daily','weekly','biweekly'))
);

CREATE UNIQUE INDEX llms_monitoring_user_url_uniq ON public.llms_monitoring (user_id, monitored_url);
CREATE INDEX llms_monitoring_due_idx ON public.llms_monitoring (next_check_at) WHERE paused = false;

ALTER TABLE public.llms_monitoring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own monitoring" ON public.llms_monitoring
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own monitoring" ON public.llms_monitoring
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own monitoring" ON public.llms_monitoring
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own monitoring" ON public.llms_monitoring
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all monitoring" ON public.llms_monitoring
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER llms_monitoring_updated_at
  BEFORE UPDATE ON public.llms_monitoring
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Check history
CREATE TABLE public.llms_monitoring_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_id uuid NOT NULL REFERENCES public.llms_monitoring(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT llms_monitoring_checks_status_check CHECK (status IN ('unchanged','changed','file_removed','error'))
);

CREATE INDEX llms_monitoring_checks_monitoring_idx ON public.llms_monitoring_checks (monitoring_id, checked_at DESC);

ALTER TABLE public.llms_monitoring_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own checks" ON public.llms_monitoring_checks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all checks" ON public.llms_monitoring_checks
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
-- Inserts done by edge function with service role (bypasses RLS).