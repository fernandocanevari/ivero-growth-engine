// Regras de precificação reusando os valores da landing (InvestSection)
// Fonte única de verdade para propostas geradas automaticamente.

export type PlanoSugerido = "presenca" | "influencia" | "autoridade";

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
    monthlyPrice: 497,
    annualPrice: 397,
    highlights: [
      "Score GEO de Visibilidade",
      "Tags de Percepção da IA",
      "Monitoramento Multi-IA",
      "Diagnóstico e gerador de LLMs.txt",
      "Gerador de Conteúdo Estratégico",
      "Análise de Resultados",
      "Alertas de mudança de recomendação",
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
    highlights: [
      "Dominância por Modelo de IA",
      "Análise de Sentimento",
      "Análise Comparativa com concorrentes",
      "Evolução Estratégica dos 5 pilares",
      "Campanhas direcionadas de presença",
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
    highlights: [
      "Simulador de Influência em IA",
      "Mapa de Prompts Estratégicos",
      "Plano de Ação Estratégico",
      "Prompt Tester (testes customizados nos 3 modelos)",
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
