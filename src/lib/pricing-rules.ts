// Regras de precificação reusando os valores da landing (InvestSection)
// Fonte única de verdade para propostas geradas automaticamente.

export type PlanoSugerido = "presenca" | "influencia" | "autoridade" | "dominio";

export interface PlanoInfo {
  key: PlanoSugerido;
  name: string;
  tagline: string;
  monthlyPrice: number; // em R$
  annualPrice: number; // em R$ (mensalidade equivalente, cobrança anual)
  highlights: string[];
  metrics: { label: string; value: string }[];
}

export const PLANOS: Record<PlanoSugerido, PlanoInfo> = {
  presenca: {
    key: "presenca",
    name: "Presença",
    tagline: "Descubra se as IAs reconhecem sua marca",
    monthlyPrice: 197,
    annualPrice: 157,
    highlights: ["Score GEO de Visibilidade", "Relatório semanal por e-mail"],
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
    monthlyPrice: 397,
    annualPrice: 317,
    highlights: ["Análise de Sentimento", "Análise Comparativa com concorrentes"],
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
    monthlyPrice: 697,
    annualPrice: 557,
    highlights: ["Mapa de Prompts Estratégicos", "Plano de Ação Estratégico"],
    metrics: [
      { label: "IAs monitoradas", value: "4" },
      { label: "Avisos/mês", value: "Ilimitados" },
      { label: "Prompts monitorados", value: "100" },
      { label: "Consultas/mês", value: "10.000" },
    ],
  },
  dominio: {
    key: "dominio",
    name: "Domínio",
    tagline: "Presença em IA como vantagem competitiva real",
    monthlyPrice: 1497,
    annualPrice: 1197,
    highlights: ["Dominância por Modelo de IA", "Simulador de Influência em IA"],
    metrics: [
      { label: "IAs monitoradas", value: "5" },
      { label: "Avisos/mês", value: "Ilimitados" },
      { label: "Prompts monitorados", value: "Ilimitados" },
      { label: "Consultas/mês", value: "Ilimitadas" },
    ],
  },
};

export function planoFromScore(score: number): PlanoSugerido {
  if (score < 40) return "presenca";
  if (score < 60) return "influencia";
  if (score < 80) return "autoridade";
  return "dominio";
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
