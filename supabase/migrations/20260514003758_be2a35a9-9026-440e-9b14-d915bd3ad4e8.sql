
CREATE TABLE public.dashboard_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  visited_diagnostico boolean NOT NULL DEFAULT false,
  visited_score boolean NOT NULL DEFAULT false,
  visited_acoes boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.dashboard_onboarding_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.dashboard_onboarding_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.dashboard_onboarding_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.dashboard_onboarding_progress FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_dashboard_onboarding_progress_updated_at
  BEFORE UPDATE ON public.dashboard_onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
