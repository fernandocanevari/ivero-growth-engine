// Fonte única de verdade para nomes, preços, métricas e highlights dos planos.
// Consumidores: InvestSection (landing), EscolherPlanoPage (checkout), UpgradeModal
// (dashboard), onboarding-recommendation, RecusaModal, PropostaComercialPage,
// OnboardingPerguntasPage, edge function responder-proposta.
// Edge function create-checkout duplica só os valores anuais em
// supabase/functions/_shared/pricing.ts (Deno não importa de src/); o teste
// pricing-rules.test.ts trava divergência.

export type PlanoSugerido = "presenca" | "influencia" | "autoridade";

export interface PlanoMetric {
  label: string;
  value: string;
}

export interface PlanoInfo {
  key: PlanoSugerido;
  name: string;
  tagline: string;
  monthlyPrice: number; // em R$
  annualPrice: number; // em R$ (mensalidade equivalente, cobrança anual)
  highlights: string[];
  metrics: PlanoMetric[];
  badge: string | null;         // default para landing/EscolherPlano; UpgradeModal sobrescreve
  highlighted: boolean;         // default para landing/EscolherPlano; UpgradeModal sobrescreve
  inheritsFrom: string | null;
}

export const PLANOS: Record<PlanoSugerido, PlanoInfo> = {
  presenca: {
    key: "presenca",
    name: "Presença",
    tagline: "Descubra se as IAs reconhecem sua marca",
    monthlyPrice: 497,
    annualPrice: 397,
    badge: null,
    highlighted: false,
    inheritsFrom: null,
    highlights: [
      "Score GEO de Visibilidade",
      "Relatório semanal por e-mail",
      "Monitoramento Multi-IA",
      "Prompt Tester",
    ],
    metrics: [
      { label: "IAs monitoradas", value: "2" },
      { label: "Avisos/mês", value: "50" },
      { label: "Prompts monitorados", value: "10" },
      { label: "Consultas/mês", value: "500" },
    ],
  },
  influencia: {
    key: "influencia",
    name: "Influência",
    tagline: "Monitore, reaja e não perca espaço para concorrentes",
    monthlyPrice: 897,
    annualPrice: 717,
    badge: "Mais escolhido",
    highlighted: true,
    inheritsFrom: "Presença",
    highlights: [
      "Dominância por Modelo de IA",
      "Análise de Sentimento",
      "Análise Comparativa com concorrentes",
      "Tags de Percepção da IA",
      "Evolução Estratégica dos 5 pilares",
      "Gerador de Conteúdo Estratégico",
    ],
    metrics: [
      { label: "IAs monitoradas", value: "3" },
      { label: "Avisos/mês", value: "200" },
      { label: "Prompts monitorados", value: "30" },
      { label: "Consultas/mês", value: "2.000" },
    ],
  },
  autoridade: {
    key: "autoridade",
    name: "Autoridade",
    tagline: "Sua marca citada quando o cliente está decidindo",
    monthlyPrice: 1497,
    annualPrice: 1197,
    badge: null,
    highlighted: false,
    inheritsFrom: "Influência",
    highlights: [
      "Simulador de Influência em IA",
      "Mapa de Prompts Estratégicos",
      "Plano de Ação Estratégico",
      "LLMs.txt",
      "Campanhas direcionadas",
      "Relatórios executivos em PDF e XLSX",
    ],
    metrics: [
      { label: "IAs monitoradas", value: "4" },
      { label: "Avisos/mês", value: "Ilimitados" },
      { label: "Prompts monitorados", value: "100" },
      { label: "Consultas/mês", value: "10.000" },
    ],
  },
};

export const PLANOS_ARRAY: PlanoInfo[] = [
  PLANOS.presenca,
  PLANOS.influencia,
  PLANOS.autoridade,
];

// ----- Helpers de apresentação -----

export function formatBRL(value: number): string {
  // "R$ 1.497" — sem centavos, separador de milhar brasileiro
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

export function annualSavingBRL(plano: PlanoSugerido): string {
  const p = PLANOS[plano];
  const saving = (p.monthlyPrice - p.annualPrice) * 12;
  return formatBRL(saving);
}

/**
 * Próximo degrau de plano — usado pelo UpgradeModal para destaque dinâmico.
 *  - presenca    → influencia
 *  - influencia  → autoridade
 *  - autoridade  → autoridade (topo; caller decide como sinalizar "plano atual")
 *  - null        → influencia (fallback: mesmo padrão da landing)
 */
export function nextTier(plano: PlanoSugerido | null | undefined): PlanoSugerido {
  if (plano === "presenca") return "influencia";
  if (plano === "influencia") return "autoridade";
  if (plano === "autoridade") return "autoridade";
  return "influencia";
}

// ----- Lógica de score / proposta (inalterada) -----

export function planoFromScore(score: number): PlanoSugerido {
  if (score < 40) return "presenca";
  if (score < 70) return "influencia";
  return "autoridade";
}

export function valorPropostoFromScore(score: number): number {
  return PLANOS[planoFromScore(score)].monthlyPrice;
}

export const STATUS_LABELS: Record<string, string> = {
  enviada: "Enviada",
  visualizada: "Visualizada",
  em_negociacao: "Em negociação",
  aceita: "Aceita",
  recusada: "Recusada",
  expirada: "Expirada",
};

export const MOTIVO_RECUSA_LABELS: Record<string, string> = {
  preco: "Preço alto",
  momento: "Momento ruim / sem prioridade",
  concorrente: "Já uso outra solução",
  sem_fit: "Não faz sentido para meu negócio",
  sem_resposta: "Cliente não respondeu",
  outro: "Outro motivo",
};
