import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { quoteAgency, volumeDiscountPct } from "./agency-pricing";

describe("agency volume discount", () => {
  it("faixas 0/10/20/25", () => {
    expect([1, 2, 3, 9, 10, 19, 20, 50].map(volumeDiscountPct)).toEqual([0, 0, 10, 10, 20, 20, 25, 25]);
  });
  it("calcula total com desconto", () => {
    expect(quoteAgency(["influencia", "presenca"], "mensal").total).toBe(897 + 497);
    const q = quoteAgency(["presenca", "presenca", "autoridade"], "mensal");
    expect(q.subtotal).toBe(2491);
    expect(q.total).toBe(2241.9);
  });
  it("faixas iguais no servidor", () => {
    const src = readFileSync("supabase/functions/_shared/agency-pricing.ts", "utf8");
    for (const [min, pct] of [[20, 25], [10, 20], [3, 10], [1, 0]]) {
      expect(src).toContain(`{ min: ${min}, pct: ${pct} }`);
    }
  });
});
