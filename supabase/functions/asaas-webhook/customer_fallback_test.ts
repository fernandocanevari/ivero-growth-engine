// P22: CHECKOUT_PAID sem customer no payload usa o asaas_customer_id da linha.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { capture, run, row, subscription, CK, UID } from "../_shared/checkout-binding-test-harness.ts";
const handler = await capture("../asaas-webhook/index.ts");

Deno.test("CHECKOUT_PAID sem customer: discoverCheckoutBinding recebe o asaas_customer_id gravado", async () => {
  const state = row({ asaas_customer_id: "cus_stored" });
  const event = { event: "CHECKOUT_PAID", checkout: { id: CK, customer: null, externalReference: UID, customerData: { email: "PRIVATE_EMAIL", cpfCnpj: "PRIVATE_DOC" } } };
  const r = await run(handler, event, state, { subscriptions: [subscription({ customer: "cus_stored" })], payments: [] });
  assertEquals(r.status, 200);
  assert(r.calls.some((c) => c.path.startsWith("/subscriptions?customer=cus_stored")), JSON.stringify(r.calls));
  assertEquals(state.asaas_subscription_id, "sub_new");
  assertEquals(state.asaas_customer_id, "cus_stored");
  const logs = JSON.stringify(r.logs);
  assert(!logs.includes("PRIVATE_EMAIL") && !logs.includes("PRIVATE_DOC"));
  assert(logs.includes("CHECKOUT_PAID customer fields"));
});

Deno.test("CHECKOUT_PAID com customer no payload continua usando o do payload", async () => {
  const state = row({ asaas_customer_id: "cus_stored" });
  const event = { event: "CHECKOUT_PAID", checkout: { id: CK, customer: "cus_payload", externalReference: UID } };
  const r = await run(handler, event, state, { subscriptions: [subscription({ customer: "cus_payload" })], payments: [] });
  assertEquals(r.status, 200);
  assert(r.calls.some((c) => c.path.startsWith("/subscriptions?customer=cus_payload")));
  assert(!r.calls.some((c) => c.path.includes("cus_stored")));
});
