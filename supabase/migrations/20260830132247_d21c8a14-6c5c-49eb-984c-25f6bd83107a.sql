ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS ciclo_contratado text NOT NULL DEFAULT 'anual',
  ADD COLUMN IF NOT EXISTS compromisso_inicio timestamptz,
  ADD COLUMN IF NOT EXISTS compromisso_meses integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS ciclos_pagos integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.validate_assinatura_ciclo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ciclo_contratado IS NULL OR NEW.ciclo_contratado NOT IN ('mensal', 'anual') THEN
    RAISE EXCEPTION 'ciclo_contratado inválido: use mensal ou anual';
  END IF;
  IF NEW.ciclos_pagos IS NULL OR NEW.ciclos_pagos < 0 THEN
    NEW.ciclos_pagos := 0;
  END IF;
  IF NEW.compromisso_meses IS NULL OR NEW.compromisso_meses < 1 THEN
    NEW.compromisso_meses := 12;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_assinatura_ciclo_trg ON public.assinaturas;
CREATE TRIGGER validate_assinatura_ciclo_trg
  BEFORE INSERT OR UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.validate_assinatura_ciclo();