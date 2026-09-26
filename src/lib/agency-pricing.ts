// Desconto progressivo por volume (contas de agência).
// ESPELHO de supabase/functions/_shared/agency-pricing.ts — o servidor é quem
// decide o valor cobrado; aqui é só a prévia da tela.
import { PLANOS, type PlanoSugerido } from "@/lib/pricing-rules";

export type Ciclo = "mensal" | "anual";

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

export function quoteAgency(planos: PlanoSugerido[], ciclo: Ciclo) {
  const values = planos.map((p) => (ciclo === "mensal" ? PLANOS[p].monthlyPrice : PLANOS[p].annualPrice));
  const subtotal = values.reduce((s, v) => s + v, 0);
  const discountPct = volumeDiscountPct(planos.length);
  const total = Math.round(subtotal * (1 - discountPct / 100) * 100) / 100;
  return { values, subtotal, discountPct, discount: Math.round((subtotal - total) * 100) / 100, total };
}
