ALTER TABLE public.analysis_history
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'reanalise';

ALTER TABLE public.analysis_history
  DROP CONSTRAINT IF EXISTS analysis_history_source_check;

ALTER TABLE public.analysis_history
  ADD CONSTRAINT analysis_history_source_check
  CHECK (source IN ('preview', 'reanalise'));