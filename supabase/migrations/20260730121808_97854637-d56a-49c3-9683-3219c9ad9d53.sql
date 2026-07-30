ALTER TABLE public.brand_settings ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz NULL;

UPDATE public.brand_settings
SET onboarding_completed_at = now()
WHERE onboarding_completed_at IS NULL
  AND brand_name IS NOT NULL
  AND length(trim(brand_name)) > 0;