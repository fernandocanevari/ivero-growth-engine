CREATE OR REPLACE FUNCTION public.protect_agency_brand_billing()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.plano := NULL; NEW.plano_pretendido := NULL;
    ELSIF NEW.plano IS DISTINCT FROM OLD.plano OR NEW.plano_pretendido IS DISTINCT FROM OLD.plano_pretendido THEN
      RAISE EXCEPTION 'plano da marca só pode ser alterado pelo faturamento';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE TRIGGER protect_agency_brand_billing_trg
BEFORE INSERT OR UPDATE ON public.agency_brands
FOR EACH ROW EXECUTE FUNCTION public.protect_agency_brand_billing();