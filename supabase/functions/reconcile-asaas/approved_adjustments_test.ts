import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { evaluateSubscriptionPayments, selectFallbackSubscription, payloadKeys } from "../_shared/reconcile-decision.ts";
import { checkoutSchedule, preserveCheckoutState, restoreCheckoutState, type CheckoutContext } from "../_shared/checkout-state.ts";
import { trialEligibility } from "../_shared/trial-eligibility.ts";
import { matchWebhookRow } from "../asaas-webhook/matching.ts";

const UID = "ba97500d-53c6-426b-b5e6-7015bfcf4395";
const CK_AT = "2026-10-17T00:32:11Z";
const NOW = new Date(CK_AT);
const REQ = { value: 497, cycle: "MONTHLY", plano: "presenca", ciclo: "mensal" };

Deno.test("(a) agência pendente sem trial: payload vence 16/10 Brasília, não 24/10", () => {
  const schedule = checkoutSchedule([{ status: "pendente", trial_ends_at: null, ciclos_pagos: 0 }], NOW);
  assertEquals(schedule.trialConcedido, false);
  assertEquals(schedule.trialEndsAt, null);
  assertEquals(schedule.nextDueDate, "2026-10-16");
});
Deno.test("trial expirado em 05/10 não recebe segundo período", () => {
  assertEquals(checkoutSchedule([{ status: "expirado", trial_ends_at: "2026-10-05T23:50:53Z", ciclos_pagos: 0 }], NOW).nextDueDate, "2026-10-16");
});
Deno.test("(b) duas aberturas preservam data original e vencimento no fim do trial", () => {
  const row = { status: "trial", trial_ends_at: "2026-10-20T12:00:00Z", ciclos_pagos: 0 };
  const first = preserveCheckoutState(row, REQ, "https://example.test/first");
  const second = preserveCheckoutState({ ...row, checkout_context: first }, REQ, "https://example.test/second");
  assertEquals(second.prev, first.prev);
  assertEquals(second.prev.trial_ends_at, row.trial_ends_at);
  assertEquals(checkoutSchedule([{ ...row, checkout_context: second }], NOW).nextDueDate, "2026-10-20");
  assertEquals(trialEligibility([{ ...row, status: "pendente" }], NOW.getTime()).trialConcedido, true);
});
Deno.test("histórico pago em outra linha proíbe novo trial", () => {
  assertEquals(trialEligibility([{ status: "trial", trial_ends_at: "2026-10-20T12:00:00Z", ciclos_pagos: 0 }, { status: "cancelado", trial_ends_at: null, ciclos_pagos: 1 }], NOW.getTime()).trialConcedido, false);
});
Deno.test("sem linha ou trial sem data válida nunca é elegível", () => {
  assertEquals(trialEligibility([], NOW.getTime()).trialConcedido, false);
  assertEquals(trialEligibility([{ status: "trial", trial_ends_at: null, ciclos_pagos: 0 }], NOW.getTime()).trialConcedido, false);
});
Deno.test("(c) limpeza restaura trial, estado e histórico; limpa só a tentativa", () => {
  const previous = { status: "trial", trial_ends_at: "2026-10-20T12:00:00Z", ciclos_pagos: 0, data_inicio: "2026-10-13T12:00:00Z", data_vencimento: "2026-11-13T12:00:00Z", plano: "presenca", ciclo_contratado: "mensal" };
  const context = preserveCheckoutState(previous, REQ, "https://example.test");
  const restored = restoreCheckoutState({ status: "pendente", trial_ends_at: null, checkout_context: context }, NOW);
  assertEquals(restored.status, "trial");
  assertEquals(restored.trial_ends_at, previous.trial_ends_at);
  assertEquals(restored.data_inicio, previous.data_inicio);
  assertEquals(restored.data_vencimento, previous.data_vencimento);
  assertEquals(restored.asaas_checkout_id, null);
  assertEquals(restored.checkout_context, null);
});
Deno.test("limpeza não reabre trial que venceu durante checkout", () => {
  const ctx = preserveCheckoutState({ status: "trial", trial_ends_at: "2026-10-05T23:50:53Z" }, REQ, "https://example.test");
  const restored = restoreCheckoutState({ status: "pendente", trial_ends_at: null, checkout_context: ctx }, NOW);
  assertEquals(restored.status, "expirado");
  assertEquals(restored.trial_ends_at, "2026-10-05T23:50:53Z");
});
Deno.test("(d) CHECKOUT_PAID sem data, checkout exato → vínculo aceito", async () => {
  const result = await matchWebhookRow("CHECKOUT_PAID", null, true, "sub_new", "ck_exact", UID, async (path, id) => path === "checkout" && id === "ck_exact" ? { asaas_checkout_created_at: CK_AT } : null);
  assertEquals(result?.matched, "checkout");
});
Deno.test("CHECKOUT_PAID solto precisa de data; checkout errado não vincula por assinatura", async () => {
  const result = await matchWebhookRow("CHECKOUT_PAID", null, false, "sub_old", "wrong", UID, async (path) => path === "checkout" ? null : { asaas_checkout_created_at: CK_AT });
  assertEquals(result, null);
});
Deno.test("(e) dois candidatos não adotam nada", () => {
  const subs = ["sub_a", "sub_b"].map((id) => ({ id, dateCreated: "2026-10-16", value: 497, cycle: "MONTHLY" }));
  assertEquals(selectFallbackSubscription(subs, UID, CK_AT, REQ).reason, "ambiguous");
  assertEquals(selectFallbackSubscription(subs, UID, CK_AT, REQ).candidate, null);
});
Deno.test("assinatura legada de junho nunca é adotada", () => {
  const old = { id: "sub_6efcpiiawg8nczfs", dateCreated: "2026-06-23", externalReference: UID, value: 497, cycle: "MONTHLY" };
  assertEquals(selectFallbackSubscription([old], UID, CK_AT, REQ).candidate, null);
});
Deno.test("cliente compartilhado só vincula por referência OU valor+ciclo e data", () => {
  const a = { id: "sub_a", dateCreated: "2026-10-16", value: 497, cycle: "MONTHLY" };
  const other = { id: "sub_c", dateCreated: "2026-10-16", value: 897, cycle: "MONTHLY" };
  assertEquals(selectFallbackSubscription([a, other], UID, CK_AT, REQ).candidate?.id, "sub_a");
  assertEquals(selectFallbackSubscription([{ ...a, cycle: "YEARLY" }], UID, CK_AT, REQ).candidate, null);
});
Deno.test("cobrança futura PENDING só vincula sem ativar", () => {
  assertEquals(evaluateSubscriptionPayments("sub_a", CK_AT, [{ subscription: "sub_a", status: "PENDING", dueDate: "2026-10-24" }]).outcome, "link");
});
Deno.test("sem cobrança comprovada não vincula assinatura", () => {
  assertEquals(evaluateSubscriptionPayments("sub_a", CK_AT, []).outcome, "none");
});
Deno.test("(f) CONFIRMED mesmo dia é aceito nos três caminhos de matching", async () => {
  for (const path of ["subscription", "checkout", "externalReference"] as const) {
    const result = await matchWebhookRow("PAYMENT_CONFIRMED", "2026-10-16", true, "sub_new", "ck_exact", UID, async (p) => p === path ? { asaas_checkout_created_at: CK_AT } : null);
    assertEquals(result?.matched, path);
  }
  assertEquals(evaluateSubscriptionPayments("sub_new", CK_AT, [{ subscription: "sub_new", status: "CONFIRMED", confirmedDate: "2026-10-16" }]).outcome, "activate");
});
Deno.test("(f) sequência checkout concluído → CONFIRMED usa assinatura previamente vinculada", async () => {
  let bound = "";
  const ck = await matchWebhookRow("CHECKOUT_PAID", null, false, "sub_new", "ck_exact", UID, async (p) => p === "checkout" ? { asaas_checkout_created_at: CK_AT } : null);
  if (ck) bound = "sub_new";
  const paid = await matchWebhookRow("PAYMENT_CONFIRMED", "2026-10-16", true, "sub_new", "", UID, async (p, id) => p === "subscription" && id === bound ? { asaas_checkout_created_at: CK_AT } : null);
  assertEquals(paid?.matched, "subscription");
});
Deno.test("log de chaves não contém dados pessoais, cartão ou segredo", () => {
  const keys = JSON.stringify(payloadKeys({ event: "CHECKOUT_PAID", checkout: { id: "ck_x", card: "PRIVATE_CARD", email: "PRIVATE_EMAIL" }, secret: "PRIVATE_TOKEN" }));
  assertEquals(keys.includes("PRIVATE_"), false);
});
