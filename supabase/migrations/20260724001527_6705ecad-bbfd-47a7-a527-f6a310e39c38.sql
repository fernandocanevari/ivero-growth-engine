-- Dedupe: keep only the most recent onboarding_responses row per brand_id
DELETE FROM public.onboarding_responses o
USING (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY brand_id ORDER BY created_at DESC, id DESC) AS rn
    FROM public.onboarding_responses
  ) ranked
  WHERE ranked.rn > 1
) dupes
WHERE o.id = dupes.id;

-- Add the missing UNIQUE constraint so upsert(onConflict: 'brand_id') works
ALTER TABLE public.onboarding_responses
  ADD CONSTRAINT onboarding_responses_brand_id_unique UNIQUE (brand_id);