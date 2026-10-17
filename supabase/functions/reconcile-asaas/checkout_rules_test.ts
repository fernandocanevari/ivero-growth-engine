import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  brDay, evaluateCheckoutPayments, isOneOffPayment, onOrAfterCheckoutDay, paymentProofDay,
} from "../_shared/reconcile-decision.ts";

const CK = "0b848b3e-ck";
const CK_AT = "2026-10-16T00:00:17Z"; // = 15/10 21:00 BRT

Deno.test("dia do checkout é calculado em Brasília", () => {
  assertEquals(brDay(CK_AT), "2026-10-15");
});

Deno.test("(a) pagamento no mesmo dia, data só com dia, é aceito; junho não", () => {
  assert(onOrAfterCheckoutDay("2026-10-15", CK_AT));
  assert(!onOrAfterCheckoutDay("2026-06-23", CK_AT));
  const ev = evaluateCheckoutPayments(CK, CK_AT, [
    { status: "CONFIRMED", checkoutSession: CK, subscription: "sub_new", confirmedDate: "2026-10-15" },
  ]);
  assertEquals(ev.outcome, "activate");
  assertEquals(ev.rule, "A+B");
  assertEquals(ev.subscriptionId, "sub_new");
});

Deno.test("regra B: cobrança paga com data anterior ao dia do checkout não ativa", () => {
  const ev = evaluateCheckoutPayments(CK, CK_AT, [
    { status: "RECEIVED", checkoutSession: CK, subscription: "sub_x", paymentDate: "2026-06-23" },
  ]);
  assert(ev.outcome !== "activate");
});

Deno.test("(b) trial + 1ª cobrança futura PENDING no checkout: só vincula, fica trial", () => {
  const ev = evaluateCheckoutPayments(CK, CK_AT, [
    { status: "PENDING", checkoutSession: CK, subscription: "sub_trial", dueDate: "2026-10-22", dateCreated: "2026-10-15" },
  ]);
  assertEquals(ev.outcome, "link");
  assertEquals(ev.rule, "A");
  assertEquals(ev.subscriptionId, "sub_trial");
});

Deno.test("(c) cobrança avulsa (sem assinatura e sem checkout) nunca ativa", () => {
  const avulsa = { status: "RECEIVED", subscription: null, checkoutSession: null, paymentDate: "2026-10-16" };
  assert(isOneOffPayment(avulsa));
  const ev = evaluateCheckoutPayments(CK, CK_AT, [avulsa]);
  assertEquals(ev.outcome, "none");
  assertEquals(ev.linkedCount, 0);
});

Deno.test("cobrança de outro checkout é ignorada (regra A)", () => {
  const ev = evaluateCheckoutPayments(CK, CK_AT, [
    { status: "CONFIRMED", checkoutSession: "outro", subscription: "sub_x", confirmedDate: "2026-10-15" },
  ]);
  assertEquals(ev.outcome, "none");
});

Deno.test("(d) incidente: boleto antigo de 23/06, checkout 15/10 21:00 BRT sem cobranças → nada", () => {
  // A reconciliação só consulta cobranças pelo checkoutSession: lista vazia.
  const ev = evaluateCheckoutPayments(CK, CK_AT, []);
  assertEquals(ev.outcome, "none");
  assertEquals(ev.rule, "C");
  assertEquals(ev.subscriptionId, null); // asaas_subscription_id não é sobrescrito
  // Mesmo se o boleto antigo chegasse, sem vínculo e com data antiga, não ativa.
  const old = { status: "RECEIVED", subscription: "sub_6efcpiiawg8nczfs", paymentDate: "2026-06-23" };
  assertEquals(evaluateCheckoutPayments(CK, CK_AT, [old]).outcome, "none");
  assertEquals(paymentProofDay(old), "2026-06-23");
});

Deno.test("(d) reconcile: assinatura só pelo fallback validado; promoção só após activate", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  const flow = src.slice(src.indexOf("const LIVE_STATUSES"));
  assert(!flow.includes("/subscriptions?checkoutSession"));
  assert(!flow.includes("getJson(`/checkouts/"));
  assert(flow.includes("/payments?checkoutSession="));
  // (ajuste aprovado) /subscriptions e /payments?subscription só via candidato único
  assert(flow.includes("selectFallbackSubscription(") && flow.includes("pick.candidate?.id"));
  assert(flow.indexOf("pays.items.length === 0") < flow.indexOf("/subscriptions?externalReference"));
  assert(flow.includes("pagamentosPorCheckoutSession") && flow.includes("regra:") && flow.includes("datasComparadas"));
  // limpeza do checkout abandonado (60 min) mantida, só sem cobrança vinculada
  assert(flow.includes("60 * 60 * 1000") && flow.includes("(ev?.linkedCount ?? 0) === 0"));
});

Deno.test("webhook: avulsa ignorada antes de qualquer gravação; externalReference exige regra E", async () => {
  const src = await Deno.readTextFile(new URL("../asaas-webhook/index.ts", import.meta.url));
  const oneOff = src.indexOf("isOneOffPayment(p)");
  const sw = src.indexOf("switch (event)");
  assert(oneOff > 0 && oneOff < sw);
  const matching = await Deno.readTextFile(new URL("../asaas-webhook/matching.ts", import.meta.url));
  assert(matching.includes("row && onOrAfterCheckoutDay(eventDay, row.asaas_checkout_created_at)"));
});

Deno.test("manage-subscription: resolveSubId só adota assinatura criada no dia do checkout ou depois", async () => {
  const src = await Deno.readTextFile(new URL("../manage-subscription/index.ts", import.meta.url));
  assert(src.includes("onOrAfterCheckoutDay(asaasDay(s?.dateCreated), assinatura.asaas_checkout_created_at"));
  assert(onOrAfterCheckoutDay("2026-10-15", CK_AT));
  assert(!onOrAfterCheckoutDay("2026-06-10", CK_AT));
});
