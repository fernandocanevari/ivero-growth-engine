import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { capture, run, row, subscription, CK, UID } from "../_shared/checkout-binding-test-harness.ts";
const handler = await capture("../asaas-webhook/index.ts");
const paid = (customer: unknown = "cus_new") => ({ event: "CHECKOUT_PAID", checkout: { id: CK, customer, externalReference: UID, customerData: { email: "PRIVATE_EMAIL" } } });
const created = { event: "SUBSCRIPTION_CREATED", subscription: { ...subscription(), checkoutSession: CK, externalReference: UID } };
const session = [{ subscription: "sub_new", customer: "cus_new", status: "PENDING" }];
for (const customer of ["cus_new", { id: "cus_new" }]) Deno.test(`empty subscription + customer ${typeof customer}: binds only IDs`, async () => {
  const state = row(); const before = structuredClone(state);
  const result = await run(handler, paid(customer), state, { subscriptions: [subscription()] });
  assertEquals(result.status, 200); assertEquals(state.asaas_subscription_id, "sub_new"); assertEquals(state.asaas_customer_id, "cus_new");
  for (const key of ["status", "plano", "data_vencimento", "ciclos_pagos", "compromisso_inicio"]) assertEquals(state[key as keyof typeof state], before[key as keyof typeof before]);
  assertEquals(Object.keys(result.patches[result.patches.length - 1]).sort(), ["asaas_customer_id", "asaas_subscription_id"]);
  assert(!JSON.stringify(result.logs).includes("PRIVATE_EMAIL"));
});
Deno.test("session-only lookup binds", async () => {
  const state = row(); const r = await run(handler, paid(null), state, { subscriptions: [subscription()], payments: session });
  assertEquals(r.status, 200); assertEquals(state.asaas_subscription_id, "sub_new");
});
for (const count of [0, 2]) Deno.test(`${count} candidates: WARNING, no bind, 200`, async () => {
  const state = row(); const r = await run(handler, paid(), state, { subscriptions: Array.from({ length: count }, (_, i) => subscription({ id: `sub_${i}` })) });
  assertEquals(r.status, 200); assertEquals(state.asaas_subscription_id, null); assert(r.warnings.length > 0);
});
Deno.test("already different binding is never overwritten", async () => {
  const state = row({ asaas_subscription_id: "sub_other" }); await run(handler, paid(), state, { subscriptions: [subscription()] });
  assertEquals(state.asaas_subscription_id, "sub_other");
});
Deno.test("old subscription never chosen", async () => {
  const state = row(); await run(handler, paid(), state, { subscriptions: [subscription({ id: "sub_old" })] }); assertEquals(state.asaas_subscription_id, null);
});
Deno.test("duplicate and both event orders have identical result", async () => {
  const results = [];
  for (const events of [[paid(), created, paid()], [created, paid(), paid()]]) {
    const state = row(); for (const event of events) await run(handler, event, state, { subscriptions: [subscription()] });
    delete (state as Record<string, unknown>).updated_at; results.push(state);
  }
  assertEquals(results[0], results[1]);
});
Deno.test("later concurrent binding wins compare-and-set", async () => {
  const state = row(); await run(handler, paid(), state, { subscriptions: [subscription()], race: "sub_concurrent" }); assertEquals(state.asaas_subscription_id, "sub_concurrent");
});
Deno.test("network failure never changes webhook response", async () => {
  const r = await run(handler, paid(), row(), { fail: true }); assertEquals(r.status, 200); assertEquals(r.body, { received: true }); assert(r.warnings.length > 0);
});
for (const kind of ["paid", "trial", "normal"]) Deno.test(`${kind} resume/checkout: same final row as explicit binding`, async () => {
  const extra = kind === "normal" ? { status: "pendente" } : { status: "cancelado" };
  const make = () => row({ ...extra, checkout_context: { ...row().checkout_context, ...(kind === "paid" ? { resumePaidUntil: "2026-12-11T02:59:59.999Z" } : kind === "trial" ? { resumeTrialEndsAt: "2026-12-01T00:00:00Z" } : {}) } });
  const explicit = make(), discovered = make();
  await run(handler, { event: "CHECKOUT_PAID", checkout: { ...paid().checkout, subscription: "sub_new" } }, explicit);
  await run(handler, paid(), discovered, { subscriptions: [subscription()] });
  delete (explicit as Record<string, unknown>).updated_at; delete (discovered as Record<string, unknown>).updated_at;
  assertEquals(discovered, explicit);
});
Deno.test("same-plan paid-resume 397: exact final row preserved", async () => {
  const make = () => row({ status: "cancelado", plano: "presenca", plano_pretendido: "presenca", ciclos_pagos: 3,
    checkout_context: { ...row().checkout_context, requested: { value: 397, cycle: "MONTHLY", plano: "presenca", ciclo: "anual" }, resumePaidUntil: "2026-12-11T02:59:59.999Z" } });
  const explicit = make(), discovered = make();
  await run(handler, { event: "CHECKOUT_PAID", checkout: { ...paid().checkout, subscription: "sub_new" } }, explicit);
  await run(handler, paid(), discovered, { subscriptions: [subscription({ value: 397 })] });
  delete explicit.updated_at; delete discovered.updated_at;
  assertEquals(discovered, explicit); assertEquals(discovered.ciclos_pagos, 0); assertEquals(discovered.plano, "presenca");
});for (const customer of ["cus_new", null]) Deno.test(`checkout email differs from account (customer ${customer ?? "absent"}): binds without email`, async () => {
  const state = row();
  const event = { event: "CHECKOUT_PAID", checkout: { id: CK, customer, externalReference: UID, customerData: { email: "outro-email@checkout.invalid" } } };
  const r = await run(handler, event, state, { subscriptions: [subscription()], payments: customer ? [] : session });
  assertEquals(r.status, 200); assertEquals(state.asaas_subscription_id, "sub_new"); assertEquals(state.asaas_customer_id, "cus_new");
  for (const c of r.calls) {
    assert(!/email|%40|@/i.test(c.path), `email used in provider call: ${c.path}`);
    assert(!c.path.startsWith("/customers"), `customer lookup used: ${c.path}`);
  }
});
