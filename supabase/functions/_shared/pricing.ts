// Valores dos planos. FONTE CANÔNICA: src/lib/pricing-rules.ts.
// Duplicado aqui apenas porque edge functions Deno não podem importar de src/.
// Um teste em src/lib/pricing-rules.test.ts trava divergência.

export type PlanoKey = "presenca" | "influencia" | "autoridade";
export type CicloContratado = "mensal" | "anual";

/** Mensalidade cheia (ciclo mensal, sem compromisso). */
export const PLAN_MONTHLY_VALUES: Record<PlanoKey, number> = {
  presenca: 497,
  influencia: 897,
  autoridade: 1497,
};

/** Mensalidade promocional (compromisso de 12 meses). */
export const PLAN_ANNUAL_VALUES: Record<PlanoKey, number> = {
  presenca: 397,
  influencia: 717,
  autoridade: 1197,
};

/** Normaliza o ciclo recebido no body (aceita legado `billing_cycle`). */
export function normalizeCiclo(raw: unknown): CicloContratado {
  const v = String(raw ?? "").toLowerCase();
  if (v === "mensal" || v === "monthly" || v === "month") return "mensal";
  return "anual"; // default preserva o comportamento anterior
}

/** Valor mensal cobrado para o plano no ciclo escolhido. */
export function planValue(plano: string, ciclo: CicloContratado): number {
  const map = ciclo === "mensal" ? PLAN_MONTHLY_VALUES : PLAN_ANNUAL_VALUES;
  return map[plano as PlanoKey];
}

export const COMPROMISSO_MESES = 12;

/** Diferença mensal entre valor cheio e promocional. */
export function descontoMensal(plano: string): number {
  const p = plano as PlanoKey;
  return (PLAN_MONTHLY_VALUES[p] ?? 0) - (PLAN_ANNUAL_VALUES[p] ?? 0);
}

/**
 * Multa de fidelidade no cancelamento antecipado do ciclo anual:
 * diferença mensal x meses já usufruídos com desconto.
 */
export function multaFidelidade(plano: string, ciclosComDesconto: number): number {
  const ciclos = Math.max(0, Math.min(ciclosComDesconto, COMPROMISSO_MESES));
  return Math.round(descontoMensal(plano) * ciclos * 100) / 100;
}
