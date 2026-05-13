import { describe, it, expect } from "vitest";
import { PLANOS, planoFromScore, valorPropostoFromScore } from "./pricing-rules";

describe("planoFromScore", () => {
  it("score baixo → presenca", () => {
    expect(planoFromScore(0)).toBe("presenca");
    expect(planoFromScore(39)).toBe("presenca");
  });

  it("score médio → influencia", () => {
    expect(planoFromScore(40)).toBe("influencia");
    expect(planoFromScore(69)).toBe("influencia");
  });

  it("score alto → autoridade", () => {
    expect(planoFromScore(70)).toBe("autoridade");
    expect(planoFromScore(100)).toBe("autoridade");
  });
});

describe("valorPropostoFromScore", () => {
  it("retorna o monthlyPrice do plano sugerido", () => {
    expect(valorPropostoFromScore(20)).toBe(PLANOS.presenca.monthlyPrice);
    expect(valorPropostoFromScore(50)).toBe(PLANOS.influencia.monthlyPrice);
    expect(valorPropostoFromScore(85)).toBe(PLANOS.autoridade.monthlyPrice);
  });
});

describe("PLANOS — desconto anual ~20%", () => {
  it("annualPrice é aproximadamente 80% do monthlyPrice", () => {
    for (const plano of Object.values(PLANOS)) {
      const ratio = plano.annualPrice / plano.monthlyPrice;
      expect(ratio).toBeGreaterThan(0.78);
      expect(ratio).toBeLessThan(0.82);
    }
  });

  it("preços crescem entre planos", () => {
    expect(PLANOS.presenca.monthlyPrice).toBeLessThan(PLANOS.influencia.monthlyPrice);
    expect(PLANOS.influencia.monthlyPrice).toBeLessThan(PLANOS.autoridade.monthlyPrice);
  });
});
