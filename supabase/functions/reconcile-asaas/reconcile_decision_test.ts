import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decideReconcile, decideWebhookEvent, webhookEventFor } from "../_shared/reconcile-decision.ts";
import { trialEligibility, isUpgradeBlocked } from "../_shared/trial-eligibility.ts";

const NOW = Date.parse("2026-10-10T12:00:00Z");
const FUT = "2026-10-15T12:00:00Z";
const PAST = "2026-10-05T12:00:00Z";

Deno.test("sessão aberta (ACTIVE) ou abandonada: nenhuma promoção", () => {
  assertEquals(decideReconcile({ checkoutStatus: "ACTIVE", paymentStatuses: [] }), "none");
  assertEquals(decideReconcile({ checkoutStatus: "ACTIVE", paymentStatuses: ["PENDING"] }), "none");
});

Deno.test("pagamento confirmado: ativa (CONFIRMED/RECEIVED)", () => {
  assertEquals(decideReconcile({ checkoutStatus: "PAID", paymentStatuses: ["CONFIRMED"] }), "activate");
  assertEquals(decideReconcile({ checkoutStatus: "", paymentStatuses: ["RECEIVED"] }), "activate");
});

Deno.test("sessão paga + 1ª cobrança agendada: só vincula, sem promover", () => {
  assertEquals(decideReconcile({ checkoutStatus: "PAID", paymentStatuses: ["PENDING"] }), "link");
  assertEquals(decideReconcile({ checkoutStatus: "PAID", paymentStatuses: [] }), "link");
  assertEquals(decideWebhookEvent("CHECKOUT_PAID", false), "link");
});

Deno.test("sessão expirada ou cancelada: nada muda", () => {
  for (const s of ["EXPIRED", "CANCELED"]) {
    assertEquals(decideReconcile({ checkoutStatus: s, paymentStatuses: ["PENDING"] }), "closed");
  }
});

Deno.test("aviso: só PAYMENT_CONFIRMED/RECEIVED de mensalidade ativa e promove", () => {
  assertEquals(decideWebhookEvent("PAYMENT_CONFIRMED", false), "activate");
  assertEquals(decideWebhookEvent("PAYMENT_RECEIVED", false), "activate");
  assertEquals(decideWebhookEvent("PAYMENT_CONFIRMED", true), "none"); // pró-rata/multa avulsa
});

Deno.test("ordem dos avisos (CHECKOUT_PAID antes/depois de PAYMENT_CONFIRMED): resultado final ativa uma vez", () => {
  const apply = (evts: string[]) => evts.map((e) => decideWebhookEvent(e, false));
  for (const ordem of [["CHECKOUT_PAID", "PAYMENT_CONFIRMED"], ["PAYMENT_CONFIRMED", "CHECKOUT_PAID"]]) {
    const r = apply(ordem);
    assertEquals(r.filter((x) => x === "activate").length, 1);
    assert(!r.includes("closed"));
  }
});

Deno.test("reconciliação e aviso dão o mesmo resultado para o mesmo estado", () => {
  const estados = [
    { checkoutStatus: "ACTIVE", paymentStatuses: [] },
    { checkoutStatus: "ACTIVE", paymentStatuses: ["PENDING"] },
    { checkoutStatus: "PAID", paymentStatuses: ["PENDING"] },
    { checkoutStatus: "PAID", paymentStatuses: ["CONFIRMED"] },
    { checkoutStatus: "EXPIRED", paymentStatuses: [] },
    { checkoutStatus: "CANCELED", paymentStatuses: [] },
  ];
  for (const e of estados) assertEquals(decideReconcile(e), decideWebhookEvent(webhookEventFor(e), false), JSON.stringify(e));
});

Deno.test("aviso: CHECKOUT_PAID só vincula; contagem de ciclos e promoção ficam no pagamento confirmado", async () => {
  const src = await Deno.readTextFile(new URL("../asaas-webhook/index.ts", import.meta.url));
  const ck = src.slice(src.indexOf('case "CHECKOUT_PAID"'), src.indexOf('case "CHECKOUT_CANCELED"'));
  assert(ck.includes("updateAssinatura(checkoutSubId, checkoutCustomerId, {})"));
  assert(!ck.includes('status: "ativo"') && !ck.includes("promoverIntencao") && !ck.includes("promoteAgencyIntent"));
  const pay = src.slice(src.indexOf('case "PAYMENT_CONFIRMED"'), src.indexOf('case "PAYMENT_OVERDUE"'));
  assert(pay.includes('status: "ativo"') && pay.includes("promoteAgencyIntent") && pay.includes("ciclos_pagos: ciclos"));
  // localização sem depender de CHECKOUT_PAID: payment.checkoutSession e externalReference
  assert(src.includes("body?.payment?.checkoutSession"));
  assert(src.includes('.eq("asaas_checkout_id", checkoutId)'));
  assert(src.includes('.eq("user_id", externalReference)'));
});

Deno.test("trial vencido (status trial ou expirado): nunca ganha novo período grátis", () => {
  assertEquals(trialEligibility([{ status: "trial", trial_ends_at: PAST }], NOW).trialConcedido, false);
  assertEquals(trialEligibility([{ status: "expirado", trial_ends_at: PAST }], NOW).trialConcedido, false);
  assertEquals(trialEligibility([{ status: "expirado", trial_ends_at: null }], NOW).trialConcedido, false);
  assertEquals(trialEligibility([{ status: "trial", trial_ends_at: PAST }], NOW).trialEmCursoMs, null);
});

Deno.test("trial em curso mantém a data original; conta nova ganha trial", () => {
  const r = trialEligibility([{ status: "trial", trial_ends_at: FUT }], NOW);
  assertEquals(r.trialConcedido, true);
  assertEquals(r.trialEmCursoMs, Date.parse(FUT));
  assertEquals(trialEligibility([], NOW).trialConcedido, true);
});

Deno.test("reconcile só chama promoteAgencyIntent após decisão 'activate'", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(!src.includes('"ACTIVE", "RECEIVED"'), "ACTIVE não é mais tratado como pago");
  const gate = src.indexOf('if (outcome !== "activate")');
  const promote = src.indexOf("await promoteAgencyIntent(");
  assert(gate > 0 && promote > gate);
  assertEquals(src.split("await promoteAgencyIntent(").length - 1, 1);
});

Deno.test("create-checkout: assinatura ativa + plano/ciclo diferente → 409 assinatura_ativa_use_troca_de_plano", async () => {
  assertEquals(isUpgradeBlocked("ativo", "influencia", "mensal", "autoridade", "mensal"), true);
  assertEquals(isUpgradeBlocked("inadimplente", "influencia", "mensal", "influencia", "anual"), true);
  assertEquals(isUpgradeBlocked("ativo", "influencia", "mensal", "influencia", "mensal"), false); // mesmo plano → link pendente
  assertEquals(isUpgradeBlocked("trial", "presenca", "mensal", "autoridade", "mensal"), false);
  assertEquals(isUpgradeBlocked("pendente", "presenca", "mensal", "autoridade", "mensal"), false);
  const src = await Deno.readTextFile(new URL("../create-checkout/index.ts", import.meta.url));
  const i = src.indexOf("isUpgradeBlocked(existing.status");
  assert(i > 0 && src.slice(i, i + 700).includes("status: 409") && src.slice(i, i + 700).includes("assinatura_ativa_use_troca_de_plano"));
  assert(src.slice(i - 80, i).includes("!body?.agency"), "faturamento consolidado não é afetado");
  assert(src.includes("trialEligibility(history ?? [])"));
});
