// Lógica determinística para montar a proposta comercial personalizada
// a partir do score dos 5 pilares retornados por /propose-diagnostic.
// Sem chamada de IA — puro mapeamento de regras.

export type PillarKey =
  | "clareza"
  | "autoridade"
  | "posicionamento"
  | "conversao"
  | "relevancia";

export type PillarScores = Record<PillarKey, number>;

export type PlanId = "presenca" | "influencia" | "autoridade" | "dominio";

export interface CommercialPlan {
  id: PlanId;
  name: string;
  badge: string | null;
  monthlyPrice: string;
  annualPrice: string;
  tagline: string;
  highlights: string[];
}

export const PLANS: Record<PlanId, CommercialPlan> = {
  presenca: {
    id: "presenca",
    name: "Presença",
    badge: null,
    monthlyPrice: "R$ 197",
    annualPrice: "R$ 157",
    tagline: "Garanta que as IAs reconheçam sua marca.",
    highlights: [
      "2 IAs monitoradas",
      "Score GEO de Visibilidade",
      "Relatório semanal por e-mail",
    ],
  },
  influencia: {
    id: "influencia",
    name: "Influência",
    badge: null,
    monthlyPrice: "R$ 397",
    annualPrice: "R$ 317",
    tagline: "Monitore, reaja e não perca espaço para concorrentes.",
    highlights: [
      "3 IAs monitoradas",
      "Análise de Sentimento",
      "Comparativo com concorrentes",
    ],
  },
  autoridade: {
    id: "autoridade",
    name: "Autoridade",
    badge: "🔥 Recomendado",
    monthlyPrice: "R$ 697",
    annualPrice: "R$ 557",
    tagline: "Sua marca citada no momento da decisão.",
    highlights: [
      "4 IAs monitoradas",
      "Mapa de Prompts Estratégicos",
      "Plano de Ação Estratégico",
    ],
  },
  dominio: {
    id: "dominio",
    name: "Domínio",
    badge: "🔴 Estratégico",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    tagline: "Presença em IA como vantagem competitiva real.",
    highlights: [
      "5 IAs monitoradas",
      "Dominância por Modelo de IA",
      "Simulador de Influência em IA",
    ],
  },
};

const PILLAR_LABEL: Record<PillarKey, string> = {
  clareza: "Clareza",
  autoridade: "Autoridade",
  posicionamento: "Posicionamento",
  conversao: "Conversão",
  relevancia: "Relevância",
};

const PILLAR_ACTION: Record<PillarKey, string> = {
  clareza:
    "Reescrever a proposta de valor do hero para que qualquer visitante entenda o que você faz em menos de 5 segundos.",
  autoridade:
    "Estruturar uma vitrine de provas sociais (cases, números, depoimentos) e conteúdo técnico que sinalize especialização para as IAs.",
  posicionamento:
    "Definir nicho, público-alvo e diferencial competitivo com mensagem consistente em toda a página.",
  conversao:
    "Redesenhar CTAs e fluxo de navegação para que o próximo passo seja óbvio em qualquer ponto do site.",
  relevancia:
    "Construir cobertura semântica do seu setor e responder as perguntas reais que o público faz para as IAs.",
};

export interface ProposalAction {
  pillar: PillarKey;
  label: string;
  action: string;
  score: number;
}

export interface CommercialProposal {
  overall: number;
  statusLabel: string;
  diagnosis: string;
  weakPoints: ProposalAction[];
  recommendedPlan: CommercialPlan;
  comparativeNarrative: string;
  nextSteps: string[];
}

function statusLabel(score: number): string {
  if (score >= 80) return "Referência";
  if (score >= 60) return "Sólido";
  if (score >= 40) return "Insuficiente";
  return "Crítico";
}

function pickPlan(overall: number): PlanId {
  if (overall < 40) return "dominio";
  if (overall < 60) return "autoridade";
  if (overall < 80) return "influencia";
  return "presenca";
}

function buildDiagnosis(
  brand: string,
  overall: number,
  weakest: ProposalAction[],
): string {
  const status = statusLabel(overall).toLowerCase();
  if (weakest.length === 0) {
    return `${brand} já se posiciona em patamar ${status} para ser recomendada por IAs. O foco agora é proteger a vantagem e ampliar dominância antes que concorrentes te alcancem.`;
  }
  const list = weakest.map((w) => w.label.toLowerCase()).join(" e ");
  return `${brand} está em patamar ${status} para ser recomendada por IAs. Os pontos que mais drenam visibilidade hoje são ${list} — e cada mês sem corrigir isso é espaço entregue ao concorrente.`;
}

function buildComparative(plan: CommercialPlan, overall: number): string {
  if (plan.id === "dominio") {
    return "A cada mês sem ação, sua marca perde rodadas inteiras de recomendação para concorrentes que já estão sendo citados.";
  }
  if (overall < 60) {
    return `Investimento mensal a partir de ${plan.annualPrice}/mês — menos do que o custo de uma única semana de tráfego pago perdido para um concorrente que já é citado pelas IAs.`;
  }
  return `Investimento mensal a partir de ${plan.annualPrice}/mês para transformar a influência atual em vantagem competitiva sustentável.`;
}

export function buildProposal(
  brand: string,
  pillars: PillarScores,
): CommercialProposal {
  const overall = Math.round(
    (pillars.clareza +
      pillars.autoridade +
      pillars.posicionamento +
      pillars.conversao +
      pillars.relevancia) /
      5,
  );

  // Pega todos os pilares com score < 60, ordenados pelo pior
  const weakPoints: ProposalAction[] = (
    Object.keys(pillars) as PillarKey[]
  )
    .map((p) => ({
      pillar: p,
      label: PILLAR_LABEL[p],
      action: PILLAR_ACTION[p],
      score: pillars[p],
    }))
    .filter((p) => p.score < 60)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const planId = pickPlan(overall);
  const plan = PLANS[planId];

  return {
    overall,
    statusLabel: statusLabel(overall),
    diagnosis: buildDiagnosis(brand, overall, weakPoints),
    weakPoints,
    recommendedPlan: plan,
    comparativeNarrative: buildComparative(plan, overall),
    nextSteps: [
      "Conversa de 30 minutos com um especialista Ivero para validar o diagnóstico.",
      "Onboarding em 7 dias com configuração das IAs monitoradas e prompts estratégicos.",
      "Primeiro relatório executivo em 30 dias com plano de ação priorizado.",
    ],
  };
}

export function pillarColor(score: number): {
  bar: string;
  label: string;
  text: string;
} {
  if (score >= 80)
    return {
      bar: "from-emerald-400 to-emerald-500",
      label: "Referência",
      text: "text-emerald-300",
    };
  if (score >= 60)
    return {
      bar: "from-sky-400 to-sky-500",
      label: "Sólido",
      text: "text-sky-300",
    };
  if (score >= 40)
    return {
      bar: "from-amber-400 to-amber-500",
      label: "Insuficiente",
      text: "text-amber-300",
    };
  return {
    bar: "from-rose-500 to-rose-600",
    label: "Crítico",
    text: "text-rose-300",
  };
}
