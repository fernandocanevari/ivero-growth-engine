ALTER TABLE public.agency_brands
  ADD COLUMN IF NOT EXISTS plano text,
  ADD COLUMN IF NOT EXISTS plano_pretendido text;

ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS valor_consolidado numeric,
  ADD COLUMN IF NOT EXISTS desconto_volume_pct integer;

CREATE OR REPLACE FUNCTION public.validate_agency_brand()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('ativo','removido') THEN
    RAISE EXCEPTION 'status inválido em agency_brands';
  END IF;
  IF NEW.plano IS NOT NULL AND NEW.plano NOT IN ('presenca','influencia','autoridade') THEN
    RAISE EXCEPTION 'plano inválido em agency_brands';
  END IF;
  IF NEW.plano_pretendido IS NOT NULL AND NEW.plano_pretendido NOT IN ('presenca','influencia','autoridade') THEN
    RAISE EXCEPTION 'plano_pretendido inválido em agency_brands';
  END IF;
  IF NEW.status = 'removido' AND NEW.removed_at IS NULL THEN NEW.removed_at := now(); END IF;
  IF NEW.status = 'ativo' THEN NEW.removed_at := NULL; END IF;
  RETURN NEW;
END; $function$;