import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { capture, run, row, subscription } from "../_shared/checkout-binding-test-harness.ts";
const handler = await capture("../reconcile-asaas/index.ts");
Deno.test("ativo + missing id + completed: only two IDs written", async () => {
  const state = row(), before = structuredClone(state);
  const r = await run(handler, {}, state, { subscriptions: [subscription()], payments: [{ subscription: "sub_new", status: "PENDING" }] });
  assertEquals(r.status, 200); assertEquals(r.patches, [{ asaas_subscription_id: "sub_new", asaas_customer_id: "cus_new" }]);
  assertEquals(state, { ...before, asaas_subscription_id: "sub_new", asaas_customer_id: "cus_new" });
});
for (const extra of [{ asaas_subscription_id: "sub_existing" }, { checkout_context: { completed: false } }]) Deno.test(`ativo early exit ${JSON.stringify(extra)}`, async () => {
  const r = await run(handler, {}, row(extra)); assertEquals(r.body, { reconciled: false, status: "ativo" }); assertEquals(r.calls, []); assertEquals(r.patches, []);
});
Deno.test("non-ativo overdue behavior unchanged", async () => {
  const r = await run(handler, {}, row({ status: "inadimplente" })); assertEquals(r.body.reason, "overdue_requires_webhook"); assertEquals(r.patches, []); assertEquals(r.calls, []);
});Deno.test("reconcile repair: realistic session [] binds via externalReference", async () => {
  const state = row(); const r = await run(handler, {}, state, { subscriptions: [subscription({ id: "sub_ref", customer: "cus_ref" })], payments: [] });
  assertEquals(r.status, 200); assertEquals(state.asaas_subscription_id, "sub_ref"); assertEquals(state.asaas_customer_id, "cus_ref");
});
