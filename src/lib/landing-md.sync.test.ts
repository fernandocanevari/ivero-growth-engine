import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildLandingMarkdown } from "./landing-md";
import { FAQ, HERO, PRICING_COPY } from "@/content/landing";

/**
 * Garante que public/landing.md (servido em /landing.md) não divirja da copy
 * real da landing. O arquivo é gerado por vite-plugin-landing-md.ts em dev/build.
 */
describe("landing.md", () => {
  const generated = buildLandingMarkdown();

  it("está sincronizado com o conteúdo da landing", () => {
    const onDisk = readFileSync(resolve(process.cwd(), "public/landing.md"), "utf-8");
    expect(onDisk).toBe(generated);
  });

  it("inclui hero, planos e FAQ completos", () => {
    expect(generated).toContain(HERO.headline.highlight);
    expect(generated).toContain(HERO.ctaLabel);
    expect(generated).toContain(PRICING_COPY.headline.highlight);
    for (const cta of Object.values(PRICING_COPY.ctaByPlan)) {
      expect(generated).toContain(cta);
    }
    for (const item of FAQ.items) {
      expect(generated).toContain(item.question);
      expect(generated).toContain(item.answer);
    }
  });

  it("não contém HTML nem classes de CSS", () => {
    expect(generated).not.toMatch(/<\/?[a-z][\s\S]*>/i);
    expect(generated).not.toContain("className");
  });
});
