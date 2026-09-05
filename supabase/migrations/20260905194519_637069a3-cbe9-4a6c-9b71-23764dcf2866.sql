ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS plano_pretendido text,
  ADD COLUMN IF NOT EXISTS ciclo_pretendido text;

COMMENT ON COLUMN public.assinaturas.plano_pretendido IS 'Plano escolhido em um checkout ainda não confirmado. Promovido para plano no pagamento confirmado.';
COMMENT ON COLUMN public.assinaturas.ciclo_pretendido IS 'Ciclo escolhido em um checkout ainda não confirmado. Promovido para ciclo_contratado no pagamento confirmado.';