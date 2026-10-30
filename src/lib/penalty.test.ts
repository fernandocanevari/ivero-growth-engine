import { describe, expect, it } from "vitest";
import { isPenaltyBlocked, isPenaltyPending, penaltyBlockedMessage } from "./penalty";

describe("P26 — multa de cancelamento pendente", () => {
  it("valor > 0 com cobrança ainda não tratada bloqueia", () => {
    expect(isPenaltyPending({ multa_pendente_valor: 600, multa_pendente_payment_id: "pay_1", multa_ultimo_payment_id: null })).toBe(true);
  });
  it("valor > 0 sem cobrança criada (payment_id nulo) bloqueia", () => {
    expect(isPenaltyPending({ multa_pendente_valor: 600, multa_pendente_payment_id: null })).toBe(true);
  });
  it("cobrança igual à última tratada (paga ou perdoada) não bloqueia", () => {
    expect(isPenaltyPending({ multa_pendente_valor: 600, multa_pendente_payment_id: "pay_1", multa_ultimo_payment_id: "pay_1" })).toBe(false);
  });
  it("linha antiga sem dados de multa nunca bloqueia", () => {
    expect(isPenaltyPending({})).toBe(false);
    expect(isPenaltyPending(null)).toBe(false);
  });
  it("resposta multa_pendente do checkout é reconhecida; outras não", () => {
    expect(isPenaltyBlocked({ ok: false, reason: "multa_pendente", valor: 600 })).toBe(true);
    expect(isPenaltyBlocked({ ok: false, reason: "trial_troca_local" })).toBe(false);
    expect(isPenaltyBlocked({ success: true, checkoutUrl: "x" })).toBe(false);
  });
  it("mensagem de bloqueio traz o valor com centavos", () => {
    expect(penaltyBlockedMessage(600).replace(/\u00a0/g, " ")).toBe(
      "Antes de assinar de novo, falta pagar a multa do cancelamento anterior: R$ 600,00.",
    );
  });
});
