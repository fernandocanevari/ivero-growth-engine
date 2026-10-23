import { onOrAfterCheckoutDay } from "../_shared/reconcile-decision.ts";

/** Eventos que só VINCULAM ids do Asaas à linha (nunca mudam pagamento). */
const BIND_EVENTS = ["SUBSCRIPTION_CREATED", "CHECKOUT_PAID"];
export const isBindEvent = (event: string) => BIND_EVENTS.includes(event);

type MatchableRow = {
  asaas_checkout_created_at?: string | null;
  status?: string | null;
  asaas_subscription_id_anterior?: string | null;
  checkout_context?: { resumeTrialEndsAt?: string; completed?: boolean } | null;
};

export function checkoutEventMatches(event: string, eventDay: string | null, checkoutCreatedAt: string | null | undefined, hasPayment: boolean) {
  return event === "CHECKOUT_PAID" || !hasPayment || onOrAfterCheckoutDay(eventDay, checkoutCreatedAt);
}

/**
 * Vínculo pelo usuário (externalReference ou e-mail do cliente no Asaas).
 * - Nunca religa a assinatura que já foi removida (asaas_subscription_id_anterior).
 * - Linha 'cancelado' só aceita vínculo de uma retomada de teste em andamento
 *   (cartão sendo registrado agora): evento de vínculo, resumeTrialEndsAt
 *   gravado e checkout ainda não concluído. Cancelamento comum nunca reabre.
 */
export function bindableByUser(event: string, row: MatchableRow, subscriptionId: string): boolean {
  if (subscriptionId && row.asaas_subscription_id_anterior === subscriptionId) return false;
  if (row.status !== "cancelado") return true;
  const ctx = row.checkout_context;
  return isBindEvent(event) && !!ctx?.resumeTrialEndsAt && !ctx?.completed;
}

export type MatchPath = "subscription" | "checkout" | "externalReference" | "email";

export async function matchWebhookRow<T extends MatchableRow>(
  event: string, eventDay: string | null, hasPayment: boolean,
  subscriptionId: string, checkoutId: string, externalReference: string,
  find: (path: MatchPath, id: string) => Promise<T | null>,
  customerId = "",
): Promise<{ row: T; matched: MatchPath } | null> {
  if (event !== "CHECKOUT_PAID" && subscriptionId) {
    const row = await find("subscription", subscriptionId);
    if (row) return { row, matched: "subscription" };
  }
  if (checkoutId) {
    const row = await find("checkout", checkoutId);
    if (row && checkoutEventMatches(event, eventDay, row.asaas_checkout_created_at, hasPayment)) return { row, matched: "checkout" };
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(externalReference)) {
    const row = await find("externalReference", externalReference);
    if (row && onOrAfterCheckoutDay(eventDay, row.asaas_checkout_created_at) && bindableByUser(event, row, subscriptionId)) {
      return { row, matched: "externalReference" };
    }
  }
  // Último recurso, só para eventos de vínculo: o Asaas cria um cliente NOVO a
  // cada checkout, então casamos pelo e-mail desse cliente com a conta.
  if (isBindEvent(event) && customerId) {
    const row = await find("email", customerId);
    if (row && onOrAfterCheckoutDay(eventDay, row.asaas_checkout_created_at) && bindableByUser(event, row, subscriptionId)) {
      return { row, matched: "email" };
    }
  }
  return null;
}
