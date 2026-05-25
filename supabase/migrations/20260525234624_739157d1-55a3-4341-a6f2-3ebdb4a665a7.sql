ALTER TABLE public.client_onboarding
  ADD COLUMN IF NOT EXISTS detail_1 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS detail_2 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS detail_3 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS skipped_at timestamptz NULL;