
ALTER TABLE public.brand_settings
  ADD COLUMN IF NOT EXISTS coverage_type text NOT NULL DEFAULT 'national',
  ADD COLUMN IF NOT EXISTS coverage_city text,
  ADD COLUMN IF NOT EXISTS coverage_state text,
  ADD COLUMN IF NOT EXISTS coverage_region text;

ALTER TABLE public.brand_settings
  DROP CONSTRAINT IF EXISTS brand_settings_coverage_type_check;

ALTER TABLE public.brand_settings
  ADD CONSTRAINT brand_settings_coverage_type_check
  CHECK (coverage_type IN ('national', 'regional'));

CREATE OR REPLACE FUNCTION public.validate_brand_coverage()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.coverage_type = 'regional' THEN
    IF NEW.coverage_city IS NULL OR length(trim(NEW.coverage_city)) = 0 THEN
      RAISE EXCEPTION 'Cidade é obrigatória para abrangência regional';
    END IF;
    IF NEW.coverage_state IS NULL OR length(trim(NEW.coverage_state)) = 0 THEN
      RAISE EXCEPTION 'Estado (UF) é obrigatório para abrangência regional';
    END IF;
  ELSE
    NEW.coverage_city := NULL;
    NEW.coverage_state := NULL;
    NEW.coverage_region := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_brand_coverage_trigger ON public.brand_settings;

CREATE TRIGGER validate_brand_coverage_trigger
BEFORE INSERT OR UPDATE ON public.brand_settings
FOR EACH ROW
EXECUTE FUNCTION public.validate_brand_coverage();
