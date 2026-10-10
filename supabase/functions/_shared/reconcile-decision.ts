// Decisão pura da reconciliação com o Asaas (sem rede/banco) — testável.
//
// Status oficiais de uma Checkout Session no Asaas (docs.asaas.com, "Asaas
// Checkout FAQ"): ACTIVE = disponível para pagamento (sessão ABERTA, nada
// pago), PAID = paga, CANCELED = cancelada, EXPIRED = expirada.
// Só PAID (sessão) ou cobrança RECEIVED/CONFIRMED contam como pagamento.

export const PAID_PAYMENT_STATUSES = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
export const CLOSED_CHECKOUT_STATUSES = ["EXPIRED", "CANCELED", "CANCELLED"];

export type ReconcileOutcome =
  /** pagamento confirmado → status 'ativo' + promoção dos planos pretendidos */
  | "activate"
  /** sessão concluída, 1ª cobrança agendada (trial elegível) → só vincula ids */
  | "link_trial"
  /** sessão expirada/cancelada → nunca promove */
  | "closed"
  /** sessão aberta ou sem informação → nada muda */
  | "none";

export interface ReconcileInput {
  checkoutStatus: string;
  paymentStatuses: string[];
  rowStatus: string;
  trialEndsAt: string | null;
  now?: number;
}

export function decideReconcile(i: ReconcileInput): ReconcileOutcome {
  const now = i.now ?? Date.now();
  if (i.paymentStatuses.some((s) => PAID_PAYMENT_STATUSES.includes(s))) return "activate";
  if (i.checkoutStatus === "PAID") {
    const trialMs = i.trialEndsAt ? new Date(i.trialEndsAt).getTime() : NaN;
    const trialValido = i.rowStatus === "trial" && !Number.isNaN(trialMs) && trialMs > now;
    return trialValido ? "link_trial" : "activate";
  }
  if (CLOSED_CHECKOUT_STATUSES.includes(i.checkoutStatus)) return "closed";
  return "none";
}
