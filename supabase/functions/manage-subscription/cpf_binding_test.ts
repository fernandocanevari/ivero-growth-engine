// Realistic fixtures: recurring subscriptions/charges never carry checkoutSession (real Asaas),
// and a checkout's subscription does NOT inherit the checkout's externalReference (real Asaas).
// The CPF route finds the NEW customer created by the checkout via the stored customer's CPF/CNPJ.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { capture, run, row, subscription } from "../_shared/checkout-binding-test-harness.ts";
const handler = await capture("../manage-subscription/index.ts");
// Fixture-only PII: must never appear in logs, warnings, DB writes or responses.
const CPF = "00000000191", EMAIL_NEW = "digitado-no-checkout@fixture.invalid", NAME_NEW = "Fixture Buyer Name";
const OLD = { id: "cus_000009865896", cpfCnpj: CPF, email: "conta@fixture.invalid", name: "Fixture Old Name" };
const NEW = { id: "cus_brand_new", cpfCnpj: CPF, email: EMAIL_NEW, name: NAME_NEW };
// cliente78 shape: ativo, sub NULL, old customer, completed checkout, requested 717.
const c78 = () => row({ asaas_customer_id: OLD.id, asaas_subscription_id_anterior: "sub_a1sp0ee7ogoyiogz" });
const real = (extra: Record<string, unknown> = {}) => subscription({ id: "sub_real", customer: NEW.id, ...extra });
const list = (state: Record<string, any>, subs: Record<string, any>[], extra: Record<string, unknown> = {}) =>
  run(handler, { action: "list_invoices" }, state, { customers: [OLD, NEW], subscriptions: subs, payments: [], ...extra });
// resolveSubId's pre-existing account-email customer lookup runs before the binding (harness
// answers it with []); the binding itself (from the CPF route on) never uses email.
const noEmail = (r: { calls: { path: string }[] }) => {
  const from = r.calls.findIndex((c) => c.path.includes("cpfCnpj"));
  assert(from >= 0);
  assert(!r.calls.slice(from).some((c) => c.path.includes("@") || c.path.includes("%40") || c.path.includes("email")));
};

Deno.test("cliente78: session [] and customer route empty -> binds via CPF route", async () => {
  const state = c78(), before = structuredClone(state);
  const r = await list(state, [real(), subscription({ id: "sub_a1sp0ee7ogoyiogz", customer: OLD.id, dateCreated: "2026-06-01", value: 397 })]);
  assertEquals(r.status, 200);
  assertEquals(state, { ...before, asaas_subscription_id: "sub_real", asaas_customer_id: NEW.id });
  assert(r.calls.some((c) => c.path.startsWith(`/customers/${OLD.id}`)));
  assert(r.calls.some((c) => c.path.startsWith("/customers?cpfCnpj=")));
  assert(r.calls.some((c) => c.path.startsWith(`/subscriptions?customer=${NEW.id}`)));
  assert(!r.calls.some((c) => c.path.includes("externalReference")));
  noEmail(r);
});
Deno.test("idempotent: second call does not rediscover or write", async () => {
  const state = c78(); await list(state, [real()]);
  const r = await list(state, [real()]);
  assertEquals(r.patches, []); assert(!r.calls.some((c) => c.path.includes("cpfCnpj")));
});
Deno.test("stored customer without CPF -> no bind", async () => {
  const state = c78();
  const r = await list(state, [real()], { customers: [{ id: OLD.id, email: OLD.email }] });
  assertEquals(state.asaas_subscription_id, null);
  assert(r.warnings.map((a) => a.join(" ")).some((t) => t.includes("cpf_missing")));
});
Deno.test("different CPF -> new customer not found -> no bind", async () => {
  const state = c78();
  await list(state, [real()], { customers: [OLD, { ...NEW, cpfCnpj: "99999999999" }] });
  assertEquals(state.asaas_subscription_id, null);
});
Deno.test("two matching subscriptions on the same customer -> no bind, WARNING with counts only", async () => {
  const state = c78(); const r = await list(state, [real(), real({ id: "sub_real2" })]);
  assertEquals(state.asaas_subscription_id, null);
  const w = r.warnings.map((a) => a.join(" ")).find((t) => t.includes("cpf_candidates"));
  assert(w && w.includes('"unbound":2') && !w.includes("cus_") && !w.includes("sub_"));
});
Deno.test("two matching subscriptions on different customers -> no bind", async () => {
  const third = { id: "cus_third", cpfCnpj: CPF };
  const state = c78();
  await list(state, [real(), real({ id: "sub_real2", customer: third.id })], { customers: [OLD, NEW, third] });
  assertEquals(state.asaas_subscription_id, null);
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
Deno.test("more than 10 customers with the same CPF -> no bind", async () => {
  const many = Array.from({ length: 11 }, (_, i) => ({ id: `cus_extra_${i}`, cpfCnpj: CPF }));
  const state = c78();
  const r = await list(state, [real()], { customers: [OLD, NEW, ...many] });
  assertEquals(state.asaas_subscription_id, null);
  assert(r.warnings.map((a) => a.join(" ")).some((t) => t.includes("cpf_candidates")));
  assert(!r.calls.some((c) => c.path.startsWith("/subscriptions?customer=cus_extra_")));
});
Deno.test("no log, warning, patch or response contains CPF, email or name", async () => {
  const state = c78(); const r = await list(state, [real()]);
  assertEquals(state.asaas_subscription_id, "sub_real");
  const all = JSON.stringify([r.warnings, r.logs, r.patches, r.body]);
  for (const pii of [CPF, EMAIL_NEW, NAME_NEW, OLD.email, OLD.name]) assert(!all.includes(pii), `leaked: ${pii}`);
});
