import { onOrAfterCheckoutDay } from "../_shared/reconcile-decision.ts";

export function checkoutEventMatches(event: string, eventDay: string | null, checkoutCreatedAt: string | null | undefined, hasPayment: boolean) {
  return event === "CHECKOUT_PAID" || !hasPayment || onOrAfterCheckoutDay(eventDay, checkoutCreatedAt);
}

export async function matchWebhookRow<T extends { asaas_checkout_created_at?: string | null }>(
  event: string, eventDay: string | null, hasPayment: boolean,
  subscriptionId: string, checkoutId: string, externalReference: string,
  find: (path: "subscription" | "checkout" | "externalReference", id: string) => Promise<T | null>,
): Promise<{ row: T; matched: "subscription" | "checkout" | "externalReference" } | null> {
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
    if (row && onOrAfterCheckoutDay(eventDay, row.asaas_checkout_created_at)) return { row, matched: "externalReference" };
  }
  return null;
}