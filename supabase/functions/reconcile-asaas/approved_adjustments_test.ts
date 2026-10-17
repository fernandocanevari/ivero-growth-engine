import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  brDay, decideWebhookEvent, evaluateSubscriptionPayments, onOrAfterCheckoutDay, selectFallbackSubscription,
} from "../_shared/reconcile-decision.ts";
import { trialEligibility } from "../_shared/trial-eligibility.ts";

const UID = "ba97500d-53c6-426b-b5e6-7015bfcf4395";
const CK_AT = "2026-10-17T00:32:11Z"; // 16/10 21:32 BRT
const NOW = Date.parse("2026-10-17T00:32:11Z");
const REQ = { value: 497, cycle: "MONTHLY" };

Deno.test("(a) agência trial vencido, linha 'pendente' sem trial_ends_at → não elegível, vence hoje BRT", () => {
  const r = trialEligibility([{ status: "pendente", trial_ends_at: null, ciclos_pagos: 0 }], NOW);
  assertEquals(r.trialConcedido, false);
  assertEquals(brDay(new Date(NOW).toISOString()), "2026-10-16"); // hoje em Brasília, não UTC (17/10)
  assertEquals(trialEligibility([{ status: "expirado", trial_ends_at: "2026-10-05T23:50:53Z" }], NOW).trialConcedido, false);
});

Deno.test("(b) trial válido abrindo checkout 2x: data preservada, continua elegível no fim do trial", () => {
  const fim = "2026-10-20T12:00:00Z";
  const primeira = trialEligibility([{ status: "trial", trial_ends_at: fim, ciclos_pagos: 0 }], NOW);
  // 2ª abertura: a linha guarda o contexto; mesmo se trial_ends_at sumisse, vale o preservado.
  const segunda = trialEligibility([{ status: "trial", trial_ends_at: null, ciclos_pagos: 0, checkout_context: { prev: { trial_ends_at: fim } } }], NOW);
  assertEquals(primeira, { trialConcedido: true, trialEmCursoMs: Date.parse(fim) });
  assertEquals(segunda, primeira);
  // histórico pago nunca é elegível
  assertEquals(trialEligibility([{ status: "trial", trial_ends_at: fim, ciclos_pagos: 1 }], NOW).trialConcedido, false);
});

Deno.test("(b/c) create-checkout preserva trial e reconcile restaura o estado anterior", async () => {
  const ck = await Deno.readTextFile(new URL("../create-checkout/index.ts", import.meta.url));
  assert(ck.includes("trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : effectiveTrialEndsAt(linhaMorta)"));
  assert(ck.includes("checkout_context: checkoutContextFor(linhaViva)"));
  assert(ck.includes("brDay((trialEndsAt ?? today).toISOString())"));
  assert(ck.includes("/cancel`") && ck.includes("claim_checkout_creation"));
  const rc = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(rc.includes("trial_ends_at: prev.trial_ends_at ?? null") && rc.includes("checkout_context: null"));
});

Deno.test("(d) CHECKOUT_PAID sem data com checkout exato → aceito só para vincular", async () => {
  assertEquals(decideWebhookEvent("CHECKOUT_PAID", false), "link");
  const src = await Deno.readTextFile(new URL("../asaas-webhook/index.ts", import.meta.url));
  assert(src.includes('event === "CHECKOUT_PAID" || !body?.payment'));
  assert(src.includes("CHECKOUT_PAID sem checkout correspondente")); // sem caminho solto
  assert(src.includes("keys: payloadKeys(body)"));
});

Deno.test("(e) dois candidatos → nada; assinatura de junho rejeitada; candidato único aceito", () => {
  const junho = { id: "sub_6efcpiiawg8nczfs", dateCreated: "2026-06-23", externalReference: UID, value: 497, cycle: "MONTHLY" };
  assertEquals(selectFallbackSubscription([junho], UID, CK_AT, REQ).candidate, null);
  const a = { id: "sub_a", dateCreated: "2026-10-16", value: 497, cycle: "MONTHLY" };
  const b = { id: "sub_b", dateCreated: "2026-10-16", value: 497, cycle: "MONTHLY" };
  assertEquals(selectFallbackSubscription([a, b, junho], UID, CK_AT, REQ).reason, "ambiguous");
  // cliente compartilhado sem ref e com valor diferente não conta
  const outro = { id: "sub_c", dateCreated: "2026-10-16", value: 897, cycle: "MONTHLY" };
  assertEquals(selectFallbackSubscription([a, outro, junho], UID, CK_AT, REQ).candidate?.id, "sub_a");
});

Deno.test("(e) assinatura adotada: cobrança futura PENDING só vincula", () => {
  const ev = evaluateSubscriptionPayments("sub_a", CK_AT, [{ subscription: "sub_a", status: "PENDING", dueDate: "2026-10-24", dateCreated: "2026-10-16" }]);
  assertEquals(ev.outcome, "link");
});

Deno.test("(f) pagamento imediato CONFIRMED no mesmo dia → ativa e promove marcas", async () => {
  const ev = evaluateSubscriptionPayments("sub_a", CK_AT, [{ subscription: "sub_a", status: "CONFIRMED", confirmedDate: "2026-10-16" }]);
  assertEquals(ev.outcome, "activate");
  assert(onOrAfterCheckoutDay("2026-10-16", CK_AT)); // externalReference no mesmo dia
  assertEquals(decideWebhookEvent("PAYMENT_CONFIRMED", false), "activate");
  const src = await Deno.readTextFile(new URL("../asaas-webhook/index.ts", import.meta.url));
  const pay = src.slice(src.indexOf('case "PAYMENT_CONFIRMED"'), src.indexOf('case "PAYMENT_OVERDUE"'));
  assert(pay.includes("promoteAgencyIntent") && pay.includes("ciclos_pagos: ciclos"));
});
