/**
 * Personalização pós-onboarding — mapeia as respostas P1×P2×P3 salvas em
 * onboarding_responses para (a) frase de abertura do diagnóstico e
 * (b) ferramenta prioritária destacada no dashboard.
 *
 * Respeita o gating de plano existente (isFeatureAvailable) — se a
 * ferramenta ideal estiver bloqueada no plano atual, cai para a próxima
 * ferramenta liberada da mesma família (nunca recomenda algo travado).
 */
import { isFeatureAvailable, PlanoTier } from "@/lib/access-control";

export type P3Risco =
  | "concorrente_ocupa_espaco"
  | "informacao_errada"
  | "nao_mencionado"
  | "perde_cliente_sem_saber";

export const OPENING_PHRASES: Record<P3Risco, string> = {
  concorrente_ocupa_espaco:
    "Enquanto você não monitora, seus concorrentes podem estar ocupando exatamente o espaço que devia ser seu.",
  informacao_errada:
    "Uma informação errada repetida por IA o suficiente começa a parecer verdade. Vamos corrigir isso.",
  nao_mencionado:
    "Não ser mencionado é o tipo de problema que ninguém percebe até ser tarde demais. Vamos mudar isso agora.",
  perde_cliente_sem_saber:
    "Talvez você já esteja perdendo clientes por isso, sem nenhum sinal visível. Vamos descobrir.",
};

export function getOpeningPhrase(p3?: string | null): string | null {
  if (!p3) return null;
  return OPENING_PHRASES[p3 as P3Risco] ?? null;
}

export interface RecommendedTool {
  key: string;
  name: string;
  path: string;
  description: string;
}

const TOOLS: Record<string, RecommendedTool> = {
  monitoramento: {
    key: "monitoramento",
    name: "Monitoramento Multi-IA",
    path: "/dashboard/monitoramento",
    description:
      "Veja em tempo real quando e como cada IA menciona (ou ignora) sua marca.",
  },
  comparativo: {
    key: "comparativo",
    name: "Análise Comparativa",
    path: "/dashboard/comparativo",
    description:
      "Compare sua presença com a dos concorrentes em cada modelo de IA.",
  },
  score: {
    key: "score",
    name: "Score GEO de Visibilidade",
    path: "/dashboard/score",
    description:
      "Meça e acompanhe o quanto sua marca é visível nas respostas das IAs.",
  },
  sentimento: {
    key: "sentimento",
    name: "Análise de Sentimento",
    path: "/dashboard/sentimento",
    description:
      "Descubra o tom emocional com que cada IA descreve sua marca.",
  },
  prompt_tester: {
    key: "prompt_tester",
    name: "Prompt Tester",
    path: "/dashboard/prompt-tester",
    description:
      "Teste prompts customizados nos modelos de IA e veja exatamente como sua marca aparece.",
  },
  conteudo: {
    key: "conteudo",
    name: "Gerador de Conteúdo",
    path: "/dashboard/conteudo",
    description:
      "Crie artigos, FAQs e resumos otimizados para serem citados pelas IAs.",
  },
  tags_percepcao: {
    key: "tags_percepcao",
    name: "Tags de Percepção",
    path: "/dashboard/tags-percepcao",
    description:
      "Veja as evidências semânticas que as IAs extraem do seu site.",
  },
  diagnostico: {
    key: "diagnostico",
    name: "Diagnóstico IA",
    path: "/dashboard/diagnostico",
    description:
      "Rode um novo diagnóstico para atualizar sua leitura de presença nas IAs.",
  },
};

// P2 → família (baixa, alta). Baixa maturidade = base; alta = avançada.
const RULES: Record<string, { baixa: string; alta: string }> = {
  preco_custo: { baixa: "monitoramento", alta: "comparativo" },
  confianca_reputacao: { baixa: "score", alta: "sentimento" },
  qualidade_tecnica: { baixa: "prompt_tester", alta: "conteudo" },
  indicacao_social: { baixa: "monitoramento", alta: "tags_percepcao" },
};

const MATURIDADE_ALTA = new Set([
  "aparecemos_sem_referencia",
  "aparecemos_com_destaque",
]);

// Fallback chain — do mais avançado ao mais básico. Sempre termina em
// Diagnóstico (rota sempre liberada — ALWAYS_ALLOWED).
const FALLBACK_CHAIN = [
  "comparativo",
  "sentimento",
  "tags_percepcao",
  "conteudo",
  "monitoramento",
  "prompt_tester",
  "score",
  "diagnostico",
];

export function getRecommendedTool(params: {
  p1?: string | null;
  p2?: string | null;
  plano: PlanoTier | null;
  isPaid: boolean;
  isAdmin: boolean;
  isTrial: boolean;
}): RecommendedTool | null {
  const { p1, p2, plano, isPaid, isAdmin, isTrial } = params;
  if (!p2) return null;

  const familia = RULES[p2];
  if (!familia) return null;

  const nivel = p1 && MATURIDADE_ALTA.has(p1) ? "alta" : "baixa";
  const primaryKey = familia[nivel];

  const isAllowed = (key: string) => {
    const tool = TOOLS[key];
    if (!tool) return false;
    return isFeatureAvailable(tool.path, plano, isPaid, isAdmin, isTrial);
  };

  const chain = [primaryKey, familia.baixa, ...FALLBACK_CHAIN];
  for (const key of chain) {
    if (isAllowed(key)) return TOOLS[key];
  }
  return TOOLS.diagnostico;
}
