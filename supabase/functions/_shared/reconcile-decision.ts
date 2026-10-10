// Decisões puras de pagamento (sem rede/banco) — usadas pela reconciliação
// (reconcile-asaas) e pelo aviso do Asaas (asaas-webhook), para que o mesmo
// estado no Asaas produza sempre o mesmo resultado.
//
// Status oficiais de uma Checkout Session no Asaas (docs.asaas.com, "Asaas
// Checkout FAQ"): ACTIVE = disponível para pagamento (sessão ABERTA, nada
// pago), PAID = paga, CANCELED = cancelada, EXPIRED = expirada.
// Regra: só cobrança RECEIVED/CONFIRMED ativa a conta e promove planos.
// Sessão PAID sozinha apenas vincula os ids (a 1ª cobrança pode estar
// agendada para o fim do trial).

export const PAID_PAYMENT_STATUSES = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
export const CLOSED_CHECKOUT_STATUSES = ["EXPIRED", "CANCELED", "CANCELLED"];

export type PaymentOutcome =
  /** cobrança confirmada → 'ativo' + promoção dos planos pretendidos */
  | "activate"
  /** sessão concluída sem cobrança confirmada → só vincula ids, status intacto */
  | "link"
  /** sessão expirada/cancelada → nunca promove */
  | "closed"
  /** sessão aberta ou sem informação → nada muda */
  | "none";

export interface ReconcileInput {
  checkoutStatus: string;
  paymentStatuses: string[];
}

export function decideReconcile(i: ReconcileInput): PaymentOutcome {
  if (i.paymentStatuses.some((s) => PAID_PAYMENT_STATUSES.includes(s))) return "activate";
  if (i.checkoutStatus === "PAID") return "link";
  if (CLOSED_CHECKOUT_STATUSES.includes(i.checkoutStatus)) return "closed";
  return "none";
}

/** Mesmo critério aplicado aos eventos do aviso do Asaas. */
export function decideWebhookEvent(event: string, isAvulsa: boolean): PaymentOutcome {
  if ((event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") && !isAvulsa) return "activate";
  if (event === "CHECKOUT_PAID") return "link";
  if (event === "CHECKOUT_CANCELED" || event === "CHECKOUT_EXPIRED") return "closed";
  return "none";
}

/** Evento do aviso equivalente ao estado lido pela reconciliação. */
export function webhookEventFor(i: ReconcileInput): string {
  if (i.paymentStatuses.some((s) => PAID_PAYMENT_STATUSES.includes(s))) return "PAYMENT_CONFIRMED";
  if (i.checkoutStatus === "PAID") return "CHECKOUT_PAID";
  if (i.checkoutStatus === "EXPIRED") return "CHECKOUT_EXPIRED";
  if (i.checkoutStatus === "CANCELED") return "CHECKOUT_CANCELED";
  return "";
}
