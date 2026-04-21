ALTER TABLE public.analysis_history
  ADD COLUMN IF NOT EXISTS perception_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;