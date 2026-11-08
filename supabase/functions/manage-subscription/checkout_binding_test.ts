import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { capture, run, row, subscription } from "../_shared/checkout-binding-test-harness.ts";
const handler = await capture("../manage-subscription/index.ts");
Deno.test("list_invoices session fallback repairs completed checkout older than 24h", async () => {
  const state = row(), before = structuredClone(state);
  const r = await run(handler, { action: "list_invoices" }, state, { subscriptions: [subscription()], payments: [{ subscription: "sub_new", status: "PENDING", value: 717, dueDate: "2026-12-10" }] });
  assertEquals(r.status, 200); assertEquals(r.patches, [{ asaas_subscription_id: "sub_new", asaas_customer_id: "cus_new" }]);
  assertEquals(state, { ...before, asaas_subscription_id: "sub_new", asaas_customer_id: "cus_new" });
  assertEquals(r.body.next.value, 717);
});
Deno.test("existing resolver candidate unchanged: no session fallback", async () => {
  const state = row(); const r = await run(handler, { action: "list_invoices" }, state, { subscriptions: [subscription({ customer: "cus_old" })] });
  assertEquals(r.status, 200); assertEquals(r.patches, [{ asaas_subscription_id: "sub_new" }]);
  assert(!r.calls.some((c) => c.path.includes("checkoutSession")));
});
Deno.test("stored subscription returns without discovery or writes", async () => {
  const r = await run(handler, { action: "list_invoices" }, row({ asaas_subscription_id: "sub_existing" }));
  assertEquals(r.status, 200); assertEquals(r.patches, []); assertEquals(r.calls.length, 1);
});