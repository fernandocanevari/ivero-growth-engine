import { describe, expect, it } from "vitest";
import { upgradeDueChipText, showChosenPlanNotice } from "./billing-display";

// 14/11/2026 12:00 em Brasília
const NOW = new Date("2026-11-14T15:00:00Z");

describe("chip de prazo do upgrade", () => {
  it("3 dias", () => expect(upgradeDueChipText("2026-11-17", NOW)).toBe("Até 17/11 (3 dias)"));
  it("1 dia", () => expect(upgradeDueChipText("2026-11-15", NOW)).toBe("Até 15/11 (1 dia)"));
  it("vence hoje", () => expect(upgradeDueChipText("2026-11-14", NOW)).toBe("Vence hoje, 14/11"));
  it("já passou", () => expect(upgradeDueChipText("2026-11-13", NOW)).toBe("Até 13/11"));
  it("conta o dia de Brasília, não o UTC (23h30 em Brasília)", () =>
    expect(upgradeDueChipText("2026-11-15", new Date("2026-11-15T02:30:00Z"))).toBe("Até 15/11 (1 dia)"));
});

describe("aviso 'Você escolheu o plano'", () => {
  const base = { status: "ativo", plano: "presenca", planoPretendido: "influencia", hasUpgradePending: false };
  it("ativo + pretendido maior + sem pendência → mostra", () => expect(showChosenPlanNotice(base)).toBe(true));
  it("ativo sem pretendido → esconde", () => expect(showChosenPlanNotice({ ...base, planoPretendido: null })).toBe(false));
  it("pretendido menor ou igual → esconde", () => {
    expect(showChosenPlanNotice({ ...base, plano: "autoridade" })).toBe(false);
    expect(showChosenPlanNotice({ ...base, plano: "influencia" })).toBe(false);
  });
  it("com upgrade pendente → esconde", () => expect(showChosenPlanNotice({ ...base, hasUpgradePending: true })).toBe(false));
  for (const status of ["cancelado", "trial", "inadimplente"]) {
    it(`${status} → esconde`, () => expect(showChosenPlanNotice({ ...base, status })).toBe(false));
  }
});
