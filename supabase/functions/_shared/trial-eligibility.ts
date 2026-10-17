// Elegibilidade ao período grátis no checkout (pura, testável).
// Regra (individual e agência): só é elegível quem tem trial AINDA VÁLIDO
// (trial_ends_at no futuro, inclusive o guardado em checkout_context),
// ciclos_pagos = 0 em todas as linhas e nenhum histórico pago.
// Linha sem trial_ends_at válido (ex.: 'pendente' com data nula) nunca é
// elegível: a 1ª cobrança vence hoje (America/Sao_Paulo).

/** Status que indicam histórico pago/contratado. */
export const PAID_HISTORY_STATUSES = ["ativo", "inadimplente", "atrasado"];
/** Mantido para compatibilidade com consumidores antigos. */
export const HISTORY_STATUSES = ["expirado", "trial_expirado", "cancelado", "ativo", "inadimplente"];

export interface HistoryRow {
  status: string | null;
  trial_ends_at: string | null;
  ciclos_pagos?: number | null;
  checkout_context?: { prev?: { trial_ends_at?: string | null } | null } | null;
}

/** trial_ends_at efetivo: o da linha ou, se apagado, o preservado no checkout. */
export function effectiveTrialEndsAt(row: HistoryRow): string | null {
  return row.trial_ends_at ?? row.checkout_context?.prev?.trial_ends_at ?? null;
}

export function trialEligibility(history: HistoryRow[], nowMs = Date.now()) {
  // Conta sem nenhuma linha (nunca passou pelo cadastro com trial): legado.
  if (history.length === 0) return { trialConcedido: true, trialEmCursoMs: null as number | null };
  const paid = history.some((r) =>
    (r.ciclos_pagos ?? 0) > 0 || PAID_HISTORY_STATUSES.includes(r.status ?? "")
  );
  if (paid) return { trialConcedido: false, trialEmCursoMs: null };
  let trialEmCursoMs: number | null = null;
  for (const row of history) {
    if (row.status === "cancelado") return { trialConcedido: false, trialEmCursoMs: null };
    const t = effectiveTrialEndsAt(row);
    const ms = t ? new Date(t).getTime() : NaN;
    if (!Number.isNaN(ms) && ms <= nowMs) return { trialConcedido: false, trialEmCursoMs: null };
    if (!Number.isNaN(ms) && ms > nowMs && trialEmCursoMs === null) trialEmCursoMs = ms;
  }
  return trialEmCursoMs === null
    ? { trialConcedido: false, trialEmCursoMs: null }
    : { trialConcedido: true, trialEmCursoMs };
}

/** Assinatura paga viva + pedido de outro plano ou ciclo → deve ser change_plan. */
export function isUpgradeBlocked(status: string, planoAtual: string, cicloAtual: string, plano: string, ciclo: string) {
  return (status === "ativo" || status === "inadimplente") && (planoAtual !== plano || (cicloAtual ?? "mensal") !== ciclo);
}
