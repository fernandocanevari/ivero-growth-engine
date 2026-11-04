// Regra pura de retomada com dias de acesso restantes (R1/R5 de 03/11).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resumableCancelledAccess, resumableCancelledTrial } from "./checkout-state.ts";
import { brDay } from "./reconcile-decision.ts";

const NOW = new Date("2026-11-04T00:00:00Z");
const iso = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();

const paid = (extra: Record<string, unknown> = {}) => ({
  status: "cancelado", trial_ends_at: null, data_vencimento: "2026-12-10T02:59:59.999Z",
  ciclos_pagos: 3, counted_payment_ids: ["p1", "p2", "p3"], ...extra,
});
const trial = (end: string) => ({ status: "cancelado", trial_ends_at: end, data_vencimento: end, ciclos_pagos: 0, counted_payment_ids: [] });

Deno.test("paga cancelada com acesso futuro → isPaid, nextDueDate = dia (Brasília) do data_vencimento", () => {
  const r = resumableCancelledAccess([paid()], NOW);
  assertEquals(r, { isPaid: true, accessUntil: "2026-12-10T02:59:59.999Z", nextDueDate: "2026-12-09" });
});

Deno.test("acesso já encerrado → null (checkout normal, cobrança hoje)", () => {
  assertEquals(resumableCancelledAccess([paid({ data_vencimento: iso(-1) })], NOW), null);
  assertEquals(resumableCancelledAccess([paid({ data_vencimento: null })], NOW), null);
});

Deno.test("R5: multa pendente → null", () => {
  assertEquals(resumableCancelledAccess([paid({ multa_pendente_valor: 600, multa_pendente_payment_id: "pay_multa" })], NOW), null);
  assertEquals(resumableCancelledAccess([paid({ multa_pendente_valor: 600, multa_pendente_payment_id: null })], NOW), null);
  assert(resumableCancelledAccess([paid({ multa_pendente_valor: 600, multa_pendente_payment_id: "pay_multa", multa_ultimo_payment_id: "pay_multa" })], NOW));
});

Deno.test("linha viva no histórico, status não cancelado ou sem nenhum pagamento → null", () => {
  assertEquals(resumableCancelledAccess([{ ...paid(), status: "ativo" }], NOW), null);
  assertEquals(resumableCancelledAccess([paid(), { status: "pendente", trial_ends_at: null, ciclos_pagos: 0 }], NOW), null);
  assertEquals(resumableCancelledAccess([paid({ status: "expirado" })], NOW), null);
  assertEquals(resumableCancelledAccess([paid({ ciclos_pagos: 0, counted_payment_ids: [] })], NOW), null);
  assertEquals(resumableCancelledAccess([paid({ ciclos_pagos: 0, counted_payment_ids: null })], NOW), null);
});

// NOW = 2026-11-04T00:00Z = 03/11 21:00 em Brasília.
Deno.test("FIX 1: acesso termina HOJE (Brasília) → null (checkout normal, cobrança hoje)", () => {
  assertEquals(resumableCancelledAccess([paid({ data_vencimento: "2026-11-04T02:59:59.999Z" })], NOW), null, "03/11 23:59 BRT");
  assertEquals(resumableCancelledAccess([paid({ data_vencimento: "2026-11-04T00:00:01.000Z" })], NOW), null, "1 s no futuro, mesmo dia");
  assertEquals(resumableCancelledAccess([paid({ data_vencimento: "2026-11-04T03:00:00.000Z" })], NOW),
    { isPaid: true, accessUntil: "2026-11-04T03:00:00.000Z", nextDueDate: "2026-11-04" }, "04/11 00:00 BRT = amanhã");
});

Deno.test("FIX 2: reativou → cancelou na janela (ciclos_pagos 0, counted_payment_ids preenchido) → isPaid no dia do data_vencimento", () => {
  const row = paid({ ciclos_pagos: 0, counted_payment_ids: ["p1", "p2", "p3"] });
  assertEquals(resumableCancelledAccess([row], NOW), { isPaid: true, accessUntil: "2026-12-10T02:59:59.999Z", nextDueDate: "2026-12-09" });
  assertEquals(resumableCancelledAccess([{ ...row, multa_pendente_valor: 600, multa_pendente_payment_id: "pay_multa" }], NOW), null, "multa pendente bloqueia");
});

Deno.test("FIX 2 c): teste cancelado (counted_payment_ids vazio, data_vencimento = cadastro + 30 dias) nunca vira caminho pago", () => {
  const signup = iso(-5);
  const row = { status: "cancelado", trial_ends_at: iso(2), data_vencimento: iso(25), data_inicio: signup, ciclos_pagos: 0, counted_payment_ids: [] };
  assertEquals(resumableCancelledAccess([row], NOW), { isPaid: false, trialEndsAt: iso(2), nextDueDate: brDay(iso(2))! });
  // Teste já encerrado: sem retomada (checkout normal), mesmo com data_vencimento no futuro.
  assertEquals(resumableCancelledAccess([{ ...row, trial_ends_at: iso(-1) }], NOW), null);
  assertEquals(resumableCancelledAccess([{ ...row, trial_ends_at: iso(-1), counted_payment_ids: null }], NOW), null);
});

Deno.test("i) teste grátis: resultado idêntico a resumableCancelledTrial, isPaid false", () => {
  const end = iso(4);
  assertEquals(resumableCancelledAccess([trial(end)], NOW), { isPaid: false, ...resumableCancelledTrial([trial(end)], NOW)! });
  assertEquals(resumableCancelledAccess([trial(end)], NOW), { isPaid: false, trialEndsAt: end, nextDueDate: brDay(end)! });
  assertEquals(resumableCancelledAccess([trial(iso(-1))], NOW), null);
});
