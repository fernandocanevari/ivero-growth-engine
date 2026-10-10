// Elegibilidade ao período grátis no checkout (pura, testável).
// Regra: só quem NUNCA usou trial nem teve histórico pago ganha os dias grátis.
// Trial que já terminou (trial_ends_at <= agora), com qualquer status
// ('trial' ou 'expirado'), NUNCA ganha novo período — cobrança imediata.

export const HISTORY_STATUSES = ["expirado", "trial_expirado", "cancelado", "ativo", "inadimplente"];

export interface HistoryRow {
  status: string | null;
  trial_ends_at: string | null;
}

export function trialEligibility(history: HistoryRow[], nowMs = Date.now()) {
  let trialConcedido = true;
  let trialEmCursoMs: number | null = null;
  for (const row of history) {
    const trialMs = row.trial_ends_at ? new Date(row.trial_ends_at).getTime() : NaN;
    const temData = !Number.isNaN(trialMs);
    if (temData && trialMs <= nowMs) { trialConcedido = false; break; }
    if (HISTORY_STATUSES.includes(row.status ?? "")) { trialConcedido = false; break; }
    if (temData && trialMs > nowMs && trialEmCursoMs === null) trialEmCursoMs = trialMs;
  }
  if (!trialConcedido) trialEmCursoMs = null;
  return { trialConcedido, trialEmCursoMs };
}

/** Assinatura paga viva + pedido de outro plano ou ciclo → deve ser change_plan. */
export function isUpgradeBlocked(status: string, planoAtual: string, cicloAtual: string, plano: string, ciclo: string) {
  return (status === "ativo" || status === "inadimplente") && (planoAtual !== plano || (cicloAtual ?? "mensal") !== ciclo);
}
