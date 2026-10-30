// P26 — multa de cancelamento (fidelidade anual) pendente.
// Espelho de supabase/functions/_shared/penalty.ts: a regra que vale é a do
// servidor (create-checkout recusa e manage-subscription/pay_penalty cobra).

export interface PenaltyColumns {
  multa_pendente_valor?: number | string | null;
  multa_pendente_ciclos?: number | null;
  multa_pendente_payment_id?: string | null;
  multa_pendente_invoice_url?: string | null;
  multa_ultimo_payment_id?: string | null;
}

/** Valor > 0 e cobrança ainda não tratada (ou não criada). Linhas antigas nunca bloqueiam. */
export function isPenaltyPending(row: PenaltyColumns | null | undefined): boolean {
  if (!row) return false;
  const valor = row.multa_pendente_valor == null ? NaN : Number(row.multa_pendente_valor);
  if (!Number.isFinite(valor) || valor <= 0) return false;
  const pid = row.multa_pendente_payment_id ?? null;
  return pid === null || pid !== (row.multa_ultimo_payment_id ?? null);
}

/** "R$ 1.234,50" (com centavos: a multa nem sempre é redonda). */
export const formatPenaltyBRL = (valor: number) =>
  `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PENALTY_BLOCK_REASON = "multa_pendente";

/** create-checkout recusou por multa pendente? */
export function isPenaltyBlocked(data: unknown): data is { ok: false; reason: "multa_pendente"; valor: number } {
  const d = data as { ok?: unknown; reason?: unknown } | null | undefined;
  return !!d && d.ok === false && d.reason === PENALTY_BLOCK_REASON;
}

export const penaltyBlockedMessage = (valor: number) =>
  `Antes de assinar de novo, falta pagar a multa do cancelamento anterior: ${formatPenaltyBRL(valor)}.`;

export const PENALTY_UNAVAILABLE_MESSAGE = "Não conseguimos abrir a cobrança agora. Tente de novo em instantes.";
export const REACTIVATE_BLOCKED_HELPER = "Disponível depois que a multa for paga.";
