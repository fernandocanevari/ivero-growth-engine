CREATE OR REPLACE FUNCTION public.claim_subscription_payment(
  _assinatura_id uuid,
  _payment_id text,
  _data_vencimento timestamptz,
  _asaas_subscription_id text DEFAULT NULL,
  _asaas_customer_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF _payment_id IS NULL OR length(_payment_id) = 0 THEN RAISE EXCEPTION 'payment_id_required'; END IF;
  IF _data_vencimento IS NULL THEN RAISE EXCEPTION 'data_vencimento_required'; END IF;

  -- Uma única instrução: só a primeira chamada para este payment_id altera a linha.
  -- No UPDATE as colunas à direita referem-se aos valores ANTIGOS da linha.
  UPDATE public.assinaturas SET
    ciclos_pagos = ciclos_pagos + 1,
    counted_payment_ids = array_append(counted_payment_ids, _payment_id),
    compromisso_inicio = CASE
      WHEN (CASE WHEN plano_pretendido IS NOT NULL AND ciclo_pretendido IS NOT NULL THEN ciclo_pretendido ELSE ciclo_contratado END) = 'anual'
        THEN coalesce(compromisso_inicio, now())
      ELSE compromisso_inicio END,
    status = 'ativo',
    carencia_ate = NULL,
    data_vencimento = _data_vencimento,
    trial_ends_at = NULL,
    checkout_context = NULL,
    plano = coalesce(plano_pretendido, plano),
    ciclo_contratado = CASE WHEN plano_pretendido IS NOT NULL AND ciclo_pretendido IS NOT NULL THEN ciclo_pretendido ELSE ciclo_contratado END,
    ciclo_pretendido = CASE WHEN plano_pretendido IS NOT NULL THEN NULL ELSE ciclo_pretendido END,
    plano_pretendido = NULL,
    asaas_subscription_id = coalesce(nullif(_asaas_subscription_id, ''), asaas_subscription_id),
    asaas_customer_id = coalesce(nullif(_asaas_customer_id, ''), asaas_customer_id),
    updated_at = now()
  WHERE id = _assinatura_id
    AND NOT (_payment_id = ANY(counted_payment_ids))
  RETURNING ciclos_pagos INTO n;

  IF n IS NOT NULL THEN
    RETURN jsonb_build_object('ciclos_pagos', n, 'counted', true);
  END IF;

  SELECT ciclos_pagos INTO n FROM public.assinaturas WHERE id = _assinatura_id;
  RETURN jsonb_build_object('ciclos_pagos', n, 'counted', false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_subscription_payment(uuid, text, timestamptz, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_subscription_payment(uuid, text, timestamptz, text, text) TO service_role;