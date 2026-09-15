/**
 * Espelho no frontend das cotas da Vitrine IA definidas no servidor
 * (supabase/functions/_shared/vitrine-quota.ts). O servidor continua sendo
 * a autoridade — aqui é só para a tela informar o limite antes do erro.
 */

export type VitrineTier = "trial" | "presenca" | "influencia" | "autoridade" | "admin";

export interface VitrineQuota {
  maxPerguntas: number;
  maxRodadasMes: number;
  maxRodadasDia: number;
}

export const VITRINE_QUOTA: Record<VitrineTier, VitrineQuota> = {
  trial: { maxPerguntas: 1, maxRodadasMes: 6, maxRodadasDia: 6 },
  presenca: { maxPerguntas: 0, maxRodadasMes: 0, maxRodadasDia: 0 },
  influencia: { maxPerguntas: 5, maxRodadasMes: 60, maxRodadasDia: 15 },
  autoridade: { maxPerguntas: 10, maxRodadasMes: 150, maxRodadasDia: 30 },
  admin: { maxPerguntas: 20, maxRodadasMes: 1000, maxRodadasDia: 100 },
};

export function vitrineTierFor(input: {
  isAdmin: boolean;
  isTrial: boolean;
  plano: "presenca" | "influencia" | "autoridade" | null;
}): VitrineTier {
  if (input.isAdmin) return "admin";
  if (input.isTrial) return "trial";
  if (input.plano === "autoridade") return "autoridade";
  if (input.plano === "influencia") return "influencia";
  return "presenca";
}

export function vitrineQuotaFor(input: {
  isAdmin: boolean;
  isTrial: boolean;
  plano: "presenca" | "influencia" | "autoridade" | null;
}): { tier: VitrineTier; quota: VitrineQuota } {
  const tier = vitrineTierFor(input);
  return { tier, quota: VITRINE_QUOTA[tier] };
}
