// Desconto progressivo por volume para contas de agência.
// ESPELHO: src/lib/agency-pricing.ts (teste trava divergência).
import { planValue, type CicloContratado, type PlanoKey } from "./pricing.ts";

export const VOLUME_TIERS: { min: number; pct: number }[] = [
  { min: 20, pct: 25 },
  { min: 10, pct: 20 },
  { min: 3, pct: 10 },
  { min: 1, pct: 0 },
];

export function volumeDiscountPct(activeBrands: number): number {
  for (const t of VOLUME_TIERS) if (activeBrands >= t.min) return t.pct;
  return 0;
}

const PLAN_RANK: Record<PlanoKey, number> = { presenca: 1, influencia: 2, autoridade: 3 };

export function highestPlan(planos: PlanoKey[]): PlanoKey {
  return planos.reduce<PlanoKey>((a, b) => (PLAN_RANK[b] > PLAN_RANK[a] ? b : a), "presenca");
}

export interface AgencyQuote {
  subtotal: number;
  discountPct: number;
  discount: number;
  total: number;
  items: { brand_id: string; plano: PlanoKey; value: number }[];
}

export function quoteAgency(
  brands: { brand_id: string; plano: PlanoKey }[],
  ciclo: CicloContratado,
): AgencyQuote {
  const items = brands.map((b) => ({ ...b, value: planValue(b.plano, ciclo) }));
  const subtotal = items.reduce((s, i) => s + i.value, 0);
  const discountPct = volumeDiscountPct(items.length);
  const total = Math.round(subtotal * (1 - discountPct / 100) * 100) / 100;
  return {
    subtotal,
    discountPct,
    discount: Math.round((subtotal - total) * 100) / 100,
    total,
    items,
  };
}
