ALTER TABLE public.brand_settings
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS objetivos text[] NOT NULL DEFAULT '{}'::text[];