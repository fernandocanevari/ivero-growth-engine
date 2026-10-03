import { describe, it, expect } from "vitest";
import { buildVitrineSuggestions, extractProductTerms, specificSectorTerm } from "./vitrine-suggestions";

const SADIA = {
  brandName: "Sadia",
  sector: "Alimentos e Bebidas - Produtos alimentícios processados e in natura",
  description:
    "A Sadia é uma das maiores marcas de alimentos do Brasil, oferecendo produtos como frios, embutidos, aves e congelados para consumidores em todo o país.",
};

describe("vitrine-suggestions", () => {
  it("Sadia sem keywords: usa produtos da descrição e nunca fala de bebidas", () => {
    const s = buildVitrineSuggestions({ ...SADIA, keywords: [], limite: 4 });
    expect(s.length).toBe(4);
    for (const q of s) expect(q.toLowerCase()).not.toContain("bebida");
    expect(s.join(" ").toLowerCase()).toContain("frios");
  });

  it("keywords da auditoria têm prioridade", () => {
    const s = buildVitrineSuggestions({ ...SADIA, keywords: ["presunto"], limite: 2 });
    expect(s.every((q) => q.toLowerCase().includes("presunto"))).toBe(true);
  });

  it("sem descrição útil usa a parte específica do setor, nunca a macro", () => {
    const s = buildVitrineSuggestions({ sector: SADIA.sector, keywords: [] });
    expect(s.length).toBeGreaterThan(0);
    for (const q of s) expect(q.toLowerCase()).not.toContain("bebida");
  });

  it("setor só macro não gera sugestão", () => {
    expect(buildVitrineSuggestions({ sector: "Alimentos e Bebidas" })).toEqual([]);
    expect(specificSectorTerm("Alimentos e Bebidas")).toBeNull();
  });

  it("extrai produtos da descrição", () => {
    expect(extractProductTerms(SADIA.description)).toEqual(["frios", "embutidos", "aves", "congelados"]);
  });
});
