import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decideReconcile } from "../_shared/reconcile-decision.ts";
import { trialEligibility } from "../_shared/trial-eligibility.ts";

const NOW = Date.parse("2026-10-10T12:00:00Z");
const FUT = "2026-10-15T12:00:00Z";
const PAST = "2026-10-05T12:00:00Z";
const base = { rowStatus: "pendente", trialEndsAt: null, now: NOW };

Deno.test("sessão aberta (ACTIVE) ou abandonada: nenhuma promoção", () => {
  assertEquals(decideReconcile({ ...base, checkoutStatus: "ACTIVE", paymentStatuses: [] }), "none");
  assertEquals(decideReconcile({ ...base, checkoutStatus: "ACTIVE", paymentStatuses: ["PENDING"] }), "none");
  assertEquals(decideReconcile({ ...base, rowStatus: "trial", trialEndsAt: FUT, checkoutStatus: "ACTIVE", paymentStatuses: [] }), "none");
});

Deno.test("pagamento imediato confirmado: ativa (cobrança CONFIRMED/RECEIVED ou sessão PAID)", () => {
  assertEquals(decideReconcile({ ...base, checkoutStatus: "PAID", paymentStatuses: ["CONFIRMED"] }), "activate");
  assertEquals(decideReconcile({ ...base, checkoutStatus: "", paymentStatuses: ["RECEIVED"] }), "activate");
  assertEquals(decideReconcile({ ...base, checkoutStatus: "PAID", paymentStatuses: [] }), "activate");
});

Deno.test("trial elegível com 1ª cobrança agendada: só vincula, permanece trial", () => {
  assertEquals(decideReconcile({ ...base, rowStatus: "trial", trialEndsAt: FUT, checkoutStatus: "PAID", paymentStatuses: ["PENDING"] }), "link_trial");
});

Deno.test("sessão expirada ou cancelada: nada muda", () => {
  for (const s of ["EXPIRED", "CANCELED"]) {
    assertEquals(decideReconcile({ ...base, checkoutStatus: s, paymentStatuses: ["PENDING"] }), "closed");
  }
});

Deno.test("caso agencia01 (sessão ACTIVE, cobrança PENDING): não promove", () => {
  assert(decideReconcile({ ...base, checkoutStatus: "ACTIVE", paymentStatuses: ["PENDING"] }) !== "activate");
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
  assert(gate > 0 && promote > gate, "promoção só depois do retorno dos casos sem pagamento");
  assertEquals(src.split("await promoteAgencyIntent(").length - 1, 1);
});

Deno.test("create-checkout usa a regra única de elegibilidade (individual e agência)", async () => {
  const src = await Deno.readTextFile(new URL("../create-checkout/index.ts", import.meta.url));
  assert(src.includes("trialEligibility(history ?? [])"));
});
