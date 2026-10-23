// Decisão pura do fim de acesso no cancelamento (testável sem rede).
//
// Teste grátis (status 'trial' sem nenhum pagamento contado): o acesso termina
// no fim do teste, nunca depois. Como o guarda de acesso lê data_vencimento
// para assinaturas canceladas, gravamos data_vencimento = trial_ends_at.
// Sem data de fim válida ou com o teste já vencido, o acesso termina agora.
//
// Assinatura paga (ao menos um pagamento contado): nada muda — acesso até o
// data_vencimento já gravado.

export interface CancelAccessRow {
  status: string | null;
  trial_ends_at: string | null;
  data_vencimento: string | null;
  ciclos_pagos: number | null;
  counted_payment_ids?: string[] | null;
}

export interface CancelAccessDecision {
  /** Cancelamento durante o teste grátis, sem pagamento contado. */
  isTrial: boolean;
  /** Data-limite do acesso devolvida ao cliente. */
  accessUntil: string | null;
  /** Valor a gravar em data_vencimento; undefined = manter o atual. */
  dataVencimento?: string;
  /** Teste sem data válida ou já vencido: o acesso termina agora. */
  endsNow: boolean;
}

export function decideCancelAccess(row: CancelAccessRow, now: Date = new Date()): CancelAccessDecision {
  const ciclosPagos = Number(row.ciclos_pagos ?? 0);
  const counted = Array.isArray(row.counted_payment_ids) ? row.counted_payment_ids.length : 0;
  const isTrial = row.status === "trial" && ciclosPagos === 0 && counted === 0;

  if (!isTrial) {
    return {
      isTrial: false,
      accessUntil: row.data_vencimento ?? row.trial_ends_at ?? null,
      endsNow: false,
    };
  }

  const endMs = row.trial_ends_at ? new Date(row.trial_ends_at).getTime() : NaN;
  if (!Number.isNaN(endMs) && endMs > now.getTime()) {
    return { isTrial: true, accessUntil: row.trial_ends_at, dataVencimento: row.trial_ends_at!, endsNow: false };
  }
  const nowIso = now.toISOString();
  return { isTrial: true, accessUntil: nowIso, dataVencimento: nowIso, endsNow: true };
}
