ALTER TABLE public.onboarding_responses
  DROP CONSTRAINT onboarding_responses_p1_maturidade_ia_check,
  DROP CONSTRAINT onboarding_responses_p2_criterio_mercado_check,
  DROP CONSTRAINT onboarding_responses_p3_maior_risco_check;

ALTER TABLE public.onboarding_responses
  ADD CONSTRAINT onboarding_responses_p1_maturidade_ia_check
    CHECK (p1_maturidade_ia = ANY (ARRAY['', 'nem_aparecemos', 'nao_sei_dizer', 'aparecemos_sem_referencia', 'aparecemos_com_destaque'])),
  ADD CONSTRAINT onboarding_responses_p2_criterio_mercado_check
    CHECK (p2_criterio_mercado = ANY (ARRAY['', 'preco_custo', 'confianca_reputacao', 'qualidade_tecnica', 'indicacao_social'])),
  ADD CONSTRAINT onboarding_responses_p3_maior_risco_check
    CHECK (p3_maior_risco = ANY (ARRAY['', 'concorrente_ocupa_espaco', 'informacao_errada', 'nao_mencionado', 'perde_cliente_sem_saber']));