import { describe, expect, it } from "vitest";
import {
  cancelDialogTrialCopy,
  cancelToastTrialCopy,
  cancelledCardTrialCopy,
  formatDiaMesSP,
  isCancelledTrial,
  isTrialBeforeCancel,
} from "./cancel-copy";

const NOW = new Date("2026-10-23T17:00:00.000Z");
const TRIAL_END = "2026-10-28T16:47:17.205Z";

describe("cancelamento: texto do teste grátis só quando isTrial", () => {
  it("formata DD/MM no fuso de São Paulo", () => {
    expect(formatDiaMesSP(TRIAL_END)).toBe("28/10");
    // 02:00 UTC do dia 29 ainda é dia 28 em São Paulo.
    expect(formatDiaMesSP("2026-10-29T02:00:00.000Z")).toBe("28/10");
  });

  it("diálogo: texto do teste só em trial", () => {
    expect(cancelDialogTrialCopy(true, TRIAL_END, NOW)).toBe(
      "Tudo bem, a gente entende. Seu teste grátis continua até 28/10 e nada será cobrado.",
    );
    expect(cancelDialogTrialCopy(false, TRIAL_END, NOW)).toBeNull();
  });

  it("diálogo: teste sem data ou vencido termina hoje", () => {
    expect(cancelDialogTrialCopy(true, null, NOW)).toBe(
      "Tudo bem, a gente entende. Seu teste grátis termina hoje e nada será cobrado.",
    );
    expect(cancelDialogTrialCopy(true, "2026-10-20T00:00:00.000Z", NOW)).toContain("termina hoje");
  });

  it("aviso: texto do teste só quando a resposta traz isTrial", () => {
    expect(cancelToastTrialCopy({ isTrial: true, accessUntil: TRIAL_END })).toEqual({
      title: "Assinatura cancelada",
      description: "Seu teste grátis continua até 28/10. Nada será cobrado.",
    });
    expect(cancelToastTrialCopy({ isTrial: true, endsNow: true, accessUntil: NOW.toISOString() })?.description).toBe(
      "Seu teste grátis termina hoje. Nada será cobrado.",
    );
    expect(cancelToastTrialCopy({ isTrial: false, accessUntil: "2026-11-20T16:47:17.205Z" })).toBeNull();
    expect(cancelToastTrialCopy(null)).toBeNull();
  });

  it("card: texto do teste só em trial cancelado", () => {
    expect(cancelledCardTrialCopy(true, TRIAL_END)).toBe("Cancelada — seu teste grátis vai até 28/10.");
    expect(cancelledCardTrialCopy(false, TRIAL_END)).toBeNull();
  });

  it("detecção antes de cancelar: trial sem pagamento", () => {
    expect(isTrialBeforeCancel("trial", 0)).toBe(true);
    expect(isTrialBeforeCancel("trial", 1)).toBe(false);
    expect(isTrialBeforeCancel("ativo", 0)).toBe(false);
  });

  it("detecção depois de cancelar: fim do acesso igual ao fim do teste e nada pago", () => {
    expect(isCancelledTrial({ status: "cancelado", ciclosPagos: 0, trialEndsAt: TRIAL_END, accessUntil: TRIAL_END })).toBe(true);
    // Pago: data_vencimento diferente do fim do teste.
    expect(
      isCancelledTrial({ status: "cancelado", ciclosPagos: 1, trialEndsAt: TRIAL_END, accessUntil: "2026-11-20T16:47:17.205Z" }),
    ).toBe(false);
    // Cancelado com o código antigo (data_vencimento = cadastro + 30).
    expect(
      isCancelledTrial({ status: "cancelado", ciclosPagos: 0, trialEndsAt: TRIAL_END, accessUntil: "2026-11-20T16:47:17.205Z" }),
    ).toBe(false);
  });
});
