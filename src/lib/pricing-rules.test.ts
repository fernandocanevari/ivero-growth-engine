import { describe, it, expect } from "vitest";
import {
  PLANOS,
  PLANOS_ARRAY,
  planoFromScore,
  valorPropostoFromScore,
  formatBRL,
  annualSavingBRL,
  nextTier,
} from "./pricing-rules";
import {
  PLAN_ANNUAL_VALUES,
  PLAN_MONTHLY_VALUES,
  planValue,
  normalizeCiclo,
  multaFidelidade,
} from "../../supabase/functions/_shared/pricing";

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

describe("edge <-> frontend price sync", () => {
  it("PLAN_ANNUAL_VALUES bate com PLANOS[k].annualPrice (create-checkout)", () => {
    expect(PLAN_ANNUAL_VALUES.presenca).toBe(PLANOS.presenca.annualPrice);
    expect(PLAN_ANNUAL_VALUES.influencia).toBe(PLANOS.influencia.annualPrice);
    expect(PLAN_ANNUAL_VALUES.autoridade).toBe(PLANOS.autoridade.annualPrice);
  });

  it("PLAN_MONTHLY_VALUES bate com PLANOS[k].monthlyPrice", () => {
    expect(PLAN_MONTHLY_VALUES.presenca).toBe(PLANOS.presenca.monthlyPrice);
    expect(PLAN_MONTHLY_VALUES.influencia).toBe(PLANOS.influencia.monthlyPrice);
    expect(PLAN_MONTHLY_VALUES.autoridade).toBe(PLANOS.autoridade.monthlyPrice);
  });

  it("planValue respeita o ciclo escolhido", () => {
    expect(planValue("presenca", "mensal")).toBe(497);
    expect(planValue("presenca", "anual")).toBe(397);
    expect(planValue("autoridade", "mensal")).toBe(1497);
    expect(planValue("autoridade", "anual")).toBe(1197);
  });

  it("normalizeCiclo aceita legado e faz default anual", () => {
    expect(normalizeCiclo("mensal")).toBe("mensal");
    expect(normalizeCiclo("monthly")).toBe("mensal");
    expect(normalizeCiclo("anual")).toBe("anual");
    expect(normalizeCiclo("annual")).toBe("anual");
    expect(normalizeCiclo(undefined)).toBe("anual");
  });

  it("multaFidelidade = diferença mensal x ciclos com desconto", () => {
    expect(multaFidelidade("presenca", 0)).toBe(0);
    expect(multaFidelidade("presenca", 2)).toBe(200);
    expect(multaFidelidade("influencia", 3)).toBe(540);
    expect(multaFidelidade("autoridade", 12)).toBe(3600);
    // nunca passa do compromisso
    expect(multaFidelidade("presenca", 20)).toBe(1200);
  });
});

describe("helpers de apresentação", () => {
  it("formatBRL usa separador brasileiro", () => {
    expect(formatBRL(1497)).toBe("R$ 1.497");
    expect(formatBRL(397)).toBe("R$ 397");
  });

  it("annualSavingBRL = (monthly - annual) * 12", () => {
    expect(annualSavingBRL("presenca")).toBe("R$ 1.200");
    expect(annualSavingBRL("influencia")).toBe("R$ 2.160");
    expect(annualSavingBRL("autoridade")).toBe("R$ 3.600");
  });

  it("PLANOS_ARRAY em ordem Presença → Influência → Autoridade", () => {
    expect(PLANOS_ARRAY.map((p) => p.key)).toEqual([
      "presenca",
      "influencia",
      "autoridade",
    ]);
  });
});

describe("nextTier", () => {
  it("presenca → influencia", () => expect(nextTier("presenca")).toBe("influencia"));
  it("influencia → autoridade", () => expect(nextTier("influencia")).toBe("autoridade"));
  it("autoridade → autoridade (topo)", () => expect(nextTier("autoridade")).toBe("autoridade"));
  it("null → influencia (fallback)", () => expect(nextTier(null)).toBe("influencia"));
  it("undefined → influencia (fallback)", () => expect(nextTier(undefined)).toBe("influencia"));
});
