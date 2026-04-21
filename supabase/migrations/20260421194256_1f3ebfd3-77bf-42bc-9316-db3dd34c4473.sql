ALTER TABLE public.analysis_history
  ADD COLUMN IF NOT EXISTS keyword_cloud jsonb NOT NULL DEFAULT '[]'::jsonb;