/**
 * Tags de Percepção da IA
 *
 * Traduz scores dos 5 pilares (0-100) em tags semânticas verde/amarelo/vermelho.
 * Função pura — usada tanto na escrita do snapshot (useAnalysisHistory.runAnalysis)
 * quanto na leitura/backfill em runtime (TagsPercepcaoPage).
 *
 * Regra: > 80 verde · 50–80 amarelo · < 50 vermelho.
 */

export type PerceptionTone = "green" | "yellow" | "red";

export type PillarKey =
  | "Clareza"
  | "Autoridade"
  | "Conversão"
  | "Posicionamento"
  | "Relevância";

export const PILLAR_KEYS: readonly PillarKey[] = [
  "Clareza",
  "Autoridade",
  "Conversão",
  "Posicionamento",
  "Relevância",
] as const;

/**
 * Mapeia colunas do DB → label do pilar exibido na UI.
 * `experience_score` aparece como "Relevância" (mesma convenção do resto do dashboard).
 */
export const PILLAR_DB_KEY: Record<PillarKey, string> = {
  Clareza: "clarity_score",
  Autoridade: "authority_score",
  Conversão: "conversion_score",
  Posicionamento: "positioning_score",
  Relevância: "experience_score",
};

/**
 * Dicionário de tags por pilar e faixa.
 * Cada faixa tem 2 tags: uma de proposição + uma de impacto.
 */
export const PERCEPTION_TAGS_BY_PILLAR: Record<
  PillarKey,
  Record<PerceptionTone, string[]>
> = {
  Clareza: {
    green: ["Proposta Clara", "Mensagem Direta"],
    yellow: ["Clareza em Evolução", "Mensagem Parcial"],
    red: ["Ruído na Comunicação", "Mensagem Confusa"],
  },
  Autoridade: {
    green: ["Alta Autoridade", "Sinais Robustos"],
    yellow: ["Autoridade em Construção", "Sinais Moderados"],
    red: ["Baixa Autoridade", "Sinais Ausentes"],
  },
  Conversão: {
    green: ["Conversão Otimizada", "Caminho Fluido"],
    yellow: ["Conversão em Evolução", "Atrito Parcial"],
    red: ["Baixa Conversão", "Atrito Crítico"],
  },
  Posicionamento: {
    green: ["Posicionamento Forte", "Diferenciação Clara"],
    yellow: ["Posicionamento em Evolução", "Diferenciação Parcial"],
    red: ["Posicionamento Frágil", "Sem Diferenciação"],
  },
  Relevância: {
    green: ["Alta Relevância", "Cobertura Sólida"],
    yellow: ["Relevância Parcial", "Cobertura Limitada"],
    red: ["Baixa Relevância", "Cobertura Mínima"],
  },
};

export function scoreToTone(score: number): PerceptionTone {
  if (score > 80) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

export function pillarToTags(
  pillar: PillarKey,
  score: number,
): { tone: PerceptionTone; labels: string[] } {
  const tone = scoreToTone(score);
  return { tone, labels: PERCEPTION_TAGS_BY_PILLAR[pillar][tone] };
}

export type PerceptionVerdict = "solid" | "partial" | "insufficient";

export interface PerceptionSnapshot {
  tags: Record<PillarKey, { tone: PerceptionTone; labels: string[] }>;
  verdict: PerceptionVerdict;
  computed_at: string;
}

/**
 * Veredito mestre baseado na distribuição de tons.
 *  - solid: ≥3 verdes E nenhuma vermelha
 *  - insufficient: ≥2 vermelhas OU 0 verdes
 *  - partial: o resto
 */
export function computeVerdict(
  tags: PerceptionSnapshot["tags"],
): PerceptionVerdict {
  const tones = Object.values(tags).map((t) => t.tone);
  const greens = tones.filter((t) => t === "green").length;
  const reds = tones.filter((t) => t === "red").length;
  if (greens >= 3 && reds === 0) return "solid";
  if (reds >= 2 || greens === 0) return "insufficient";
  return "partial";
}

/**
 * Constrói o snapshot completo a partir dos 5 scores.
 * Usado tanto na gravação (insert) quanto no backfill em runtime
 * (quando perception_snapshot está vazio em registros antigos).
 */
export function buildPerceptionSnapshot(scores: {
  clarity: number;
  authority: number;
  conversion: number;
  positioning: number;
  experience: number;
}): PerceptionSnapshot {
  const tags: PerceptionSnapshot["tags"] = {
    Clareza: pillarToTags("Clareza", scores.clarity),
    Autoridade: pillarToTags("Autoridade", scores.authority),
    Conversão: pillarToTags("Conversão", scores.conversion),
    Posicionamento: pillarToTags("Posicionamento", scores.positioning),
    Relevância: pillarToTags("Relevância", scores.experience),
  };
  return {
    tags,
    verdict: computeVerdict(tags),
    computed_at: new Date().toISOString(),
  };
}

/**
 * Type guard: snapshot vazio (`{}`) ou inválido vindo do DB.
 * Quando true, a página deve reidratar via buildPerceptionSnapshot.
 */
export function isEmptySnapshot(snap: unknown): boolean {
  if (!snap || typeof snap !== "object") return true;
  const s = snap as Partial<PerceptionSnapshot>;
  return !s.tags || Object.keys(s.tags).length === 0;
}

export const VERDICT_COPY: Record<
  PerceptionVerdict,
  { label: string; description: string; tone: PerceptionTone }
> = {
  solid: {
    label: "SIM, com solidez",
    description:
      "Sua marca apresenta sinais suficientes para ser recomendada pelas IAs.",
    tone: "green",
  },
  partial: {
    label: "PARCIALMENTE",
    description:
      "Há sinais positivos, mas pontos de fragilidade reduzem a probabilidade de recomendação consistente.",
    tone: "yellow",
  },
  insufficient: {
    label: "INSUFICIENTE",
    description:
      "Os sinais atuais não são suficientes para que as IAs recomendem sua marca com segurança.",
    tone: "red",
  },
};
