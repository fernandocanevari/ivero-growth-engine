// Realistic fixtures: recurring subscriptions/charges never carry checkoutSession (real Asaas).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { capture, run, row, subscription, UID } from "../_shared/checkout-binding-test-harness.ts";
const handler = await capture("../manage-subscription/index.ts");
const OTHER = "00000000-0000-4000-8000-000000000999";
// cliente78 shape: ativo, sub NULL, old customer, completed checkout, requested 717.
const c78 = () => row({ asaas_customer_id: "cus_000009865896", asaas_subscription_id_anterior: "sub_a1sp0ee7ogoyiogz" });
const real = (extra: Record<string, unknown> = {}) => subscription({ id: "sub_real", customer: "cus_brand_new", ...extra });
const list = (state: Record<string, any>, subs: Record<string, any>[], extra: Record<string, unknown> = {}) =>
  run(handler, { action: "list_invoices" }, state, { subscriptions: subs, payments: [], ...extra });
// resolveSubId's pre-existing account-email customer lookup runs before the binding (harness
// answers it with []); the binding itself (from the externalReference query on) never uses email.
const noEmail = (r: { calls: { path: string }[] }) => {
  const from = r.calls.findIndex((c) => c.path.includes("externalReference"));
  assert(from >= 0);
  assert(!r.calls.slice(from).some((c) => c.path.includes("@") || c.path.includes("%40") || c.path.includes("email")));
};

Deno.test("cliente78: session [] and customer route empty -> binds via externalReference", async () => {
  const state = c78(), before = structuredClone(state);
  const r = await list(state, [real(), subscription({ id: "sub_a1sp0ee7ogoyiogz", customer: "cus_000009865896", dateCreated: "2026-06-01", value: 397 })]);
  assertEquals(r.status, 200);
  assertEquals(state, { ...before, asaas_subscription_id: "sub_real", asaas_customer_id: "cus_brand_new" });
  assert(r.calls.some((c) => c.path.startsWith(`/subscriptions?externalReference=${UID}`)));
  noEmail(r);
});
Deno.test("idempotent: second call does not rediscover or write", async () => {
  const state = c78(); await list(state, [real()]);
  const r = await list(state, [real()]);
  assertEquals(r.patches, []); assert(!r.calls.some((c) => c.path.includes("externalReference")));
});
Deno.test("two candidates -> no bind, WARNING with counts only", async () => {
  const state = c78(); const r = await list(state, [real(), real({ id: "sub_real2" })]);
  assertEquals(state.asaas_subscription_id, null);
  const w = r.warnings.map((a) => a.join(" ")).find((t) => t.includes("reference_candidates"));
  assert(w && w.includes('"unbound":2') && !w.includes("cus_") && !w.includes("sub_") && !w.includes(UID));
});
Deno.test("candidate already bound to another row is excluded", async () => {
  const state = c78(); await list(state, [real()], { boundElsewhere: ["sub_real"] });
  assertEquals(state.asaas_subscription_id, null);
});
Deno.test("bound elsewhere excludes one of two -> remaining single binds", async () => {
  const state = c78(); await list(state, [real(), real({ id: "sub_taken" })], { boundElsewhere: ["sub_taken"] });
  assertEquals(state.asaas_subscription_id, "sub_real");
});
const excluded: [string, Record<string, unknown>][] = [
  ["inactive", { status: "INACTIVE" }], ["deleted", { deleted: true }],
  ["anterior", { id: "sub_a1sp0ee7ogoyiogz" }], ["older than checkout", { dateCreated: "2026-11-06" }],
  ["value mismatch", { value: 397 }], ["non-MONTHLY", { cycle: "YEARLY" }],
];
for (const [name, extra] of excluded) Deno.test(`excluded: ${name}`, async () => {
  const state = c78(); await list(state, [real(extra)]); assertEquals(state.asaas_subscription_id, null);
});
Deno.test("another user's subscription is never returned or bound", async () => {
  const state = c78(); const r = await list(state, [real({ externalReference: OTHER })]);
  assertEquals(state.asaas_subscription_id, null);
  assert(!JSON.stringify(r.body).includes("sub_real"));
});
