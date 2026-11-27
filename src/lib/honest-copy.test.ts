import { describe, expect, it } from "vitest";
import { PLANOS } from "./pricing-rules";
import { PRICING_COPY } from "@/content/landing";

describe("P55 — planos e benefícios aprovados", () => {
  it("Presença tem exatamente os três destaques disponíveis", () => {
    expect(PLANOS.presenca.highlights).toEqual([
      "Score GEO de Visibilidade", "Monitoramento Multi-IA", "Prompt Tester",
    ]);
    expect(PLANOS.presenca.highlights).not.toContain("Relatório semanal por e-mail");
  });

  it("a faixa tem cinco benefícios, sem relatório semanal", () => {
    expect(PRICING_COPY.guarantee.benefits).toEqual([
      "Score GEO", "Monitoramento de IAs", "Alertas de menções",
      "Suporte prioritário", "Onboarding Ivero",
    ]);
    expect(PRICING_COPY.guarantee.benefits).not.toContain("Relatório semanal");
  });

  it("explicita os dois contratos sem palavras proibidas", () => {
    expect(PRICING_COPY.guarantee.footnoteParts).toEqual([
      "Mensal sem fidelidade", "Anual com compromisso de 12 meses",
      "Evolua conforme sua operação cresce",
    ]);
    const texts = [...PLANOS.presenca.highlights, ...PRICING_COPY.guarantee.benefits,
      ...PRICING_COPY.guarantee.footnoteParts].join(" ");
    expect(texts).not.toMatch(/bordo|multa/i);
  });
});