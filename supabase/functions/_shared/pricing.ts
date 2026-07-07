// Valores anuais efetivamente cobrados (R$/mês, cobrança anual).
// FONTE CANÔNICA: src/lib/pricing-rules.ts (PLANOS[k].annualPrice).
// Duplicado aqui apenas porque edge functions Deno não podem importar de src/.
// Um teste em src/lib/pricing-rules.test.ts trava divergência.
export const PLAN_ANNUAL_VALUES: Record<"presenca" | "influencia" | "autoridade", number> = {
  presenca: 397,
  influencia: 717,
  autoridade: 1197,
};
