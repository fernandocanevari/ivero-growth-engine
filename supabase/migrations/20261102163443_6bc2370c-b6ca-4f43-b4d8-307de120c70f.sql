ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS desconto_acumulado numeric(10,2),
  ADD COLUMN IF NOT EXISTS ciclos_no_upgrade integer;

COMMENT ON COLUMN public.assinaturas.desconto_acumulado IS 'P26-fix2: na última troca de plano do contrato anual, total do desconto anual já usufruído até ali (por plano vigente em cada ciclo pago). NULL = nunca trocou de plano / linha antiga.';
COMMENT ON COLUMN public.assinaturas.ciclos_no_upgrade IS 'P26-fix2: valor de ciclos_pagos no momento da última troca de plano do contrato anual. NULL = nunca trocou de plano / linha antiga.';