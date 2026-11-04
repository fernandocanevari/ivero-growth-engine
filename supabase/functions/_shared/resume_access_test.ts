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

Deno.test("linha viva no histórico, status não cancelado ou ciclos_pagos 0 → null", () => {
  assertEquals(resumableCancelledAccess([{ ...paid(), status: "ativo" }], NOW), null);
  assertEquals(resumableCancelledAccess([paid(), { status: "pendente", trial_ends_at: null, ciclos_pagos: 0 }], NOW), null);
  assertEquals(resumableCancelledAccess([paid({ status: "expirado" })], NOW), null);
  assertEquals(resumableCancelledAccess([paid({ ciclos_pagos: 0 })], NOW), null);
});

Deno.test("i) teste grátis: resultado idêntico a resumableCancelledTrial, isPaid false", () => {
  const end = iso(4);
  assertEquals(resumableCancelledAccess([trial(end)], NOW), { isPaid: false, ...resumableCancelledTrial([trial(end)], NOW)! });
  assertEquals(resumableCancelledAccess([trial(end)], NOW), { isPaid: false, trialEndsAt: end, nextDueDate: brDay(end)! });
  assertEquals(resumableCancelledAccess([trial(iso(-1))], NOW), null);
});
