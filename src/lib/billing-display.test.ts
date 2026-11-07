import { describe, expect, it } from "vitest";
import { nextChargeStatusLabel, paidResumeAccessUntil } from "./billing-display";

const now = new Date("2026-11-07T13:36:00Z");
const until = "2026-12-11T02:59:59.999Z";
const row = { status: "cancelado", dataVencimento: until, ciclosPagos: 3, countedPaymentIds: [], multaPendente: null };

describe("paid resume display eligibility", () => {
  it("does not advertise paid resume for a cancelled trial", () => {
    expect(paidResumeAccessUntil({ ...row, ciclosPagos: 0 }, now)).toBeNull();
  });
  it("shows paid cancelled access with positive paid cycles", () => {
    expect(paidResumeAccessUntil(row, now)).toBe(until);
  });
  it("shows re-reactivation with zero cycles and counted payments", () => {
    expect(paidResumeAccessUntil({ ...row, ciclosPagos: 0, countedPaymentIds: ["pay_1"] }, now)).toBe(until);
  });
  it("does not show ended access", () => {
    expect(paidResumeAccessUntil({ ...row, dataVencimento: "2026-11-07T02:59:59.999Z" }, now)).toBeNull();
  });
  it("uses normal checkout when access ends today in Brasília", () => {
    expect(paidResumeAccessUntil({ ...row, dataVencimento: "2026-11-08T02:59:59.999Z" }, now)).toBeNull();
  });
  it("does not show paid resume with a pending penalty or a live subscription", () => {
    expect(paidResumeAccessUntil({ ...row, multaPendente: { valor: 100 } }, now)).toBeNull();
    expect(paidResumeAccessUntil({ ...row, status: "ativo" }, now)).toBeNull();
  });
});

describe("next-charge status", () => {
  it("labels a future pending charge as scheduled", () => {
    expect(nextChargeStatusLabel({ status: "PENDING", dueDate: "2026-11-08" }, "Aguardando pagamento", now)).toBe("Agendada para 08/11");
  });
  it("keeps pending wording today (Brasília, even after UTC midnight)", () => {
    expect(nextChargeStatusLabel({ status: "PENDING", dueDate: "2026-11-07" }, "Aguardando pagamento", new Date("2026-11-08T01:00:00Z"))).toBe("Aguardando pagamento");
  });
  it("preserves overdue wording", () => {
    expect(nextChargeStatusLabel({ status: "OVERDUE", dueDate: "2026-11-06" }, "Vencida", now)).toBe("Vencida");
    expect(nextChargeStatusLabel({ status: "PENDING", dueDate: "2026-11-06" }, "Aguardando pagamento", now)).toBe("Aguardando pagamento");
  });
});