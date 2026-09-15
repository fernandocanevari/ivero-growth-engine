// =====================================================================
// Vitrine IA — cotas por plano
// =====================================================================
// Cada rodada é uma chamada real com busca ao vivo (custo em dólar). O teto
// por plano existe para o custo não escapar. NÃO altera pricing-rules nem
// nenhuma regra de cobrança: só limita uso deste módulo.

export type VitrineTier = "trial" | "presenca" | "influencia" | "autoridade";

export interface VitrineQuota {
  /** Perguntas de compra cadastradas simultaneamente. */
  maxPerguntas: number;
  /** Rodadas (pergunta × motor) nos últimos 30 dias. */
  maxRodadasMes: number;
  /** Rodadas nas últimas 24h — proteção contra rajada. */
  maxRodadasDia: number;
}

export const VITRINE_QUOTA: Record<VitrineTier, VitrineQuota> = {
  // Trial não tem a rota liberada; a cota fica mínima por segurança.
  trial: { maxPerguntas: 1, maxRodadasMes: 6, maxRodadasDia: 6 },
  presenca: { maxPerguntas: 0, maxRodadasMes: 0, maxRodadasDia: 0 },
  // 5 perguntas × 3 motores × 4 semanas = 60 rodadas/mês.
  influencia: { maxPerguntas: 5, maxRodadasMes: 60, maxRodadasDia: 15 },
  // 10 perguntas × 3 motores × 5 rodadas = 150 rodadas/mês.
  autoridade: { maxPerguntas: 10, maxRodadasMes: 150, maxRodadasDia: 30 },
};

/** Admin não tem teto. */
export const VITRINE_QUOTA_ADMIN: VitrineQuota = {
  maxPerguntas: 20,
  maxRodadasMes: 1000,
  maxRodadasDia: 100,
};

// deno-lint-ignore no-explicit-any
type Admin = any;

export async function resolveVitrineQuota(
  admin: Admin,
  userId: string,
): Promise<{ tier: VitrineTier | "admin"; quota: VitrineQuota }> {
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (roles) return { tier: "admin", quota: VITRINE_QUOTA_ADMIN };

  const { data: assinatura } = await admin
    .from("assinaturas")
    .select("plano, status, trial_ends_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plano = (assinatura?.plano ?? "").toLowerCase();
  const status = (assinatura?.status ?? "").toLowerCase();

  if (status === "trial") return { tier: "trial", quota: VITRINE_QUOTA.trial };
  if (plano === "autoridade" || plano === "dominio") {
    return { tier: "autoridade", quota: VITRINE_QUOTA.autoridade };
  }
  if (plano === "influencia") return { tier: "influencia", quota: VITRINE_QUOTA.influencia };
  return { tier: "presenca", quota: VITRINE_QUOTA.presenca };
}
