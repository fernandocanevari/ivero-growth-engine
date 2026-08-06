/**
 * Fluxo 5 — Consistência de preços.
 *
 * Somente testes. Garante que os consumidores de preço (landing, checkout,
 * upgrade modal) leem de src/lib/pricing-rules.ts e não repetem valores
 * hardcoded que possam divergir da fonte única de verdade.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PLANOS, PLANOS_ARRAY } from "./pricing-rules";
import { PLAN_ANNUAL_VALUES } from "../../supabase/functions/_shared/pricing";

const CONSUMERS = [
  "src/components/landing/InvestSection.tsx",
  "src/pages/EscolherPlanoPage.tsx",
  "src/components/dashboard/UpgradeModal.tsx",
];

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

const PRICE_VALUES = new Set<number>();
for (const p of PLANOS_ARRAY) {
  PRICE_VALUES.add(p.monthlyPrice);
  PRICE_VALUES.add(p.annualPrice);
}

describe("Fluxo 5 — consumidores usam a fonte única de preços", () => {
  it.each(CONSUMERS)("%s importa de pricing-rules", (file) => {
    expect(read(file)).toMatch(/from "@\/lib\/pricing-rules"/);
  });

  it.each(CONSUMERS)("%s não repete nenhum preço hardcoded", (file) => {
    const src = read(file);
    for (const value of PRICE_VALUES) {
      // procura o número solto (não parte de outro número) no JSX/JS
      const re = new RegExp(`(?<![\\d.])${value}(?![\\d])`);
      expect(src, `preço ${value} hardcoded em ${file}`).not.toMatch(re);
    }
  });

  it.each(CONSUMERS)("%s renderiza os planos a partir de PLANOS_ARRAY", (file) => {
    expect(read(file)).toMatch(/PLANOS_ARRAY\.map/);
  });
});

describe("Fluxo 5 — integridade da tabela de preços", () => {
  it("todo plano tem nome, tagline, highlights e métricas", () => {
    for (const p of PLANOS_ARRAY) {
      expect(p.name.trim().length).toBeGreaterThan(0);
      expect(p.tagline.trim().length).toBeGreaterThan(0);
      expect(p.highlights.length).toBeGreaterThan(0);
      expect(p.metrics.length).toBeGreaterThan(0);
      expect(p.monthlyPrice).toBeGreaterThan(0);
      expect(p.annualPrice).toBeGreaterThan(0);
      expect(p.annualPrice).toBeLessThan(p.monthlyPrice);
    }
  });

  it("apenas um plano vem destacado por padrão", () => {
    expect(PLANOS_ARRAY.filter((p) => p.highlighted)).toHaveLength(1);
  });

  it("as chaves de PLANOS e PLAN_ANNUAL_VALUES são as mesmas", () => {
    expect(Object.keys(PLAN_ANNUAL_VALUES).sort()).toEqual(Object.keys(PLANOS).sort());
  });

  it("cada plano herda do anterior na escada de valor", () => {
    expect(PLANOS.presenca.inheritsFrom).toBeNull();
    expect(PLANOS.influencia.inheritsFrom).toBe(PLANOS.presenca.name);
    expect(PLANOS.autoridade.inheritsFrom).toBe(PLANOS.influencia.name);
  });
});
