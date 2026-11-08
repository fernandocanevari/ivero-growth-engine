import { asaasDay, evaluateCheckoutPayments, onOrAfterCheckoutDay, type AsaasPayment, type AsaasSubscription } from "./reconcile-decision.ts";

// Binding only: never decides access, payment confirmation or plan promotion.
export interface BindingRow {
  id: string;
  asaas_subscription_id?: string | null;
  asaas_subscription_id_anterior?: string | null;
  asaas_checkout_id?: string | null;
  asaas_checkout_created_at?: string | null;
  checkout_context?: { requested?: { value: number | null } | null; completed?: boolean } | null;
}
type Subscription = AsaasSubscription & { customer?: string; deleted?: boolean };
export type BindingGet = (path: string) => Promise<{ ok: boolean; data: Record<string, any> | null }>;
type Warning = (message: string, details: { count?: number; reason: string }) => void;
export type BindingIds = { asaas_subscription_id: string; asaas_customer_id: string };

async function pages(get: BindingGet, path: string): Promise<Record<string, any>[]> {
  const rows: Record<string, any>[] = [];
  for (let offset = 0; offset < 10000; offset += 100) {
    const result = await get(`${path}&limit=100&offset=${offset}`);
    if (!result.ok || !Array.isArray(result.data?.data)) throw new Error("incomplete_lookup");
    rows.push(...result.data.data);
    if (!result.data.hasMore) return rows;
  }
  throw new Error("incomplete_lookup");
}

function valid(s: Subscription, row: BindingRow): boolean {
  const value = row.checkout_context?.requested?.value;
  return !!s.id && s.id !== row.asaas_subscription_id_anterior && s.status === "ACTIVE" &&
    s.deleted !== true && typeof value === "number" && Number.isFinite(value) &&
    Number(s.value) === value && onOrAfterCheckoutDay(asaasDay(s.dateCreated), row.asaas_checkout_created_at);
}

/** Rule A is evaluated by the existing evaluator, not reimplemented here. */
export async function discoverCheckoutBinding(
  row: BindingRow, customerId: string | null, get: BindingGet,
  warn: Warning = (message, details) => console.warn(message, JSON.stringify(details)),
): Promise<BindingIds | null> {
  try {
    if (row.asaas_subscription_id || !row.asaas_checkout_id) return null;
    if (customerId) {
      const rows = await pages(get, `/subscriptions?customer=${encodeURIComponent(customerId)}`);
      const candidates = [...new Map(rows.filter((s) => (!s.customer || s.customer === customerId) && valid(s, row)).map((s) => [s.id, s])).values()];
      if (candidates.length === 1) return { asaas_subscription_id: candidates[0].id, asaas_customer_id: customerId };
      warn("checkout-binding WARNING", { count: candidates.length, reason: "customer_candidates" });
      if (candidates.length > 1) return null;
    }
    const ck = row.asaas_checkout_id;
    const payments = (await pages(get, `/payments?checkoutSession=${encodeURIComponent(ck)}`))
      .map((p) => ({ ...p, checkoutSession: p.checkoutSession ?? ck })) as AsaasPayment[];
    const linked = payments.filter((p) => evaluateCheckoutPayments(ck, row.asaas_checkout_created_at, [p]).subscriptionId);
    const ids = [...new Set(linked.map((p) => p.subscription).filter((id): id is string => typeof id === "string" && !!id))];
    const candidates: BindingIds[] = [];
    for (const id of ids) {
      const result = await get(`/subscriptions/${encodeURIComponent(id)}`);
      if (!result.ok || !result.data || result.data.id !== id) throw new Error("subscription_lookup_failed");
      const s = result.data as Subscription;
      if (valid(s, row) && typeof s.customer === "string" && s.customer) {
        candidates.push({ asaas_subscription_id: id, asaas_customer_id: s.customer });
      }
    }
    if (candidates.length === 1) return candidates[0];
    warn("checkout-binding WARNING", { count: candidates.length, reason: "session_candidates" });
    return null;
  } catch {
    warn("checkout-binding WARNING", { reason: "lookup_failed" });
    return null;
  }
}

/** Compare-and-set: a concurrent SUBSCRIPTION_CREATED always wins safely. */
export async function bindCheckoutIds(db: any, row: BindingRow, ids: BindingIds): Promise<string | null> {
  try {
    const { data, error } = await db.from("assinaturas").update(ids)
      .eq("id", row.id).eq("asaas_checkout_id", row.asaas_checkout_id)
      .is("asaas_subscription_id", null).select("asaas_subscription_id");
    if (error) throw error;
    if (data?.length) return ids.asaas_subscription_id;
    const { data: current, error: readError } = await db.from("assinaturas")
      .select("asaas_subscription_id").eq("id", row.id).maybeSingle();
    if (readError) throw readError;
    return current?.asaas_subscription_id ?? null;
  } catch {
    console.warn("checkout-binding WARNING", JSON.stringify({ reason: "bind_failed" }));
    return null;
  }
}