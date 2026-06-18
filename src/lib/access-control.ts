/**
 * Access control — define quais rotas do dashboard ficam liberadas
 * durante o trial de 7 dias (e quando o trial expira).
 *
 * Estratégia de produto:
 *  - Trial entrega valor real (Diagnóstico + Score + Dashboard) mas NÃO expõe
 *    a metodologia ativa (mapa de prompts, planos de ação, simulador, etc).
 *  - Isso reduz risco de concorrentes se cadastrarem só para copiar o conteúdo.
 *  - Configurações e Assinatura são liberadas porque o usuário precisa
 *    administrar a conta e fazer upgrade.
 *  - Admins ignoram o gating (verificado no consumidor, não aqui).
 *
 * Para destravar uma rota: adicione o path em TRIAL_ALLOWED_ROUTES.
 */

export const TRIAL_ALLOWED_ROUTES: readonly string[] = [
  "/dashboard",
  "/dashboard/diagnostico",
  "/dashboard/auditorias",
  "/dashboard/score",
  "/dashboard/configuracoes",
  "/dashboard/assinatura",
  // Central de Ajuda — sempre acessível, inclusive no trial.
  "/dashboard/ajuda",
  // Gerador de Conteúdo: rota acessível no trial, mas com cota de uso.
  // O bloqueio real é por uso (ver TRIAL_GENERATION_LIMIT abaixo), não por rota.
  "/dashboard/conteudo",
];

/**
 * Cota de gerações de conteúdo durante o trial.
 * Usuários no trial podem gerar até N artigos/FAQs/resumos antes de cair no UpgradeModal.
 * Admins e usuários pagos: ilimitado.
 */
export const TRIAL_GENERATION_LIMIT = 2;

/**
 * Rotas administrativas — sempre liberadas para admins, nunca aparecem
 * para trial users (sidebar já controla a visibilidade via useUserRole).
 */
const ADMIN_ROUTE_PREFIX = "/dashboard/admin";

export function isRouteAllowedInTrial(pathname: string): boolean {
  // Normaliza removendo trailing slash (exceto raiz).
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (path.startsWith(ADMIN_ROUTE_PREFIX)) return false; // admin tratado fora
  return TRIAL_ALLOWED_ROUTES.includes(path);
}

/**
 * Metadata exibida na TrialLockedPage quando o usuário tenta acessar
 * uma rota bloqueada. Mantém a sidebar como fonte da verdade dos títulos.
 */
export const LOCKED_ROUTE_INFO: Record<
  string,
  { title: string; description: string }
> = {
  "/dashboard/tags-percepcao": {
    title: "Tags de Percepção da IA",
    description:
      "Veja as evidências semânticas (verde/amarelo/vermelho) que as IAs extraem do seu site para responder à pergunta-mestre: este site é recomendável?",
  },
  "/dashboard/pilares": {
    title: "Evolução Estratégica",
    description:
      "Acompanhe a evolução dos 5 pilares da sua marca ao longo do tempo, com radar comparativo e KPIs de progresso.",
  },
  "/dashboard/monitoramento": {
    title: "Monitoramento Multi-IA",
    description:
      "Veja em tempo real quando e como ChatGPT, Gemini e Google Modo IA mencionam (ou ignoram) sua marca.",
  },
  "/dashboard/comparativo": {
    title: "Análise Comparativa",
    description:
      "Compare sua presença com a dos concorrentes em cada modelo de IA — onde você ganha, onde precisa avançar.",
  },
  "/dashboard/dominancia": {
    title: "Dominância por Modelo",
    description:
      "Identifique em quais IAs você já domina e em quais o concorrente leva vantagem, com share of voice por modelo.",
  },
  "/dashboard/sentimento": {
    title: "Análise de Sentimento",
    description:
      "Descubra o tom emocional com que cada IA descreve sua marca — positivo, neutro, crítico — e por quê.",
  },
  "/dashboard/simulador": {
    title: "Simulador de Influência",
    description:
      "Simule o impacto de novas estratégias antes de executá-las e projete o ganho de presença em cada IA.",
  },
  "/dashboard/llms-txt": {
    title: "LLMs.txt",
    description:
      "Diagnostique, gere e monitore o arquivo llms.txt da sua marca — o guia que diz às IAs como ler e citar seu site corretamente.",
  },
  "/dashboard/prompt-tester": {
    title: "Prompt Tester",
    description:
      "Teste prompts customizados nos 3 modelos de IA monitorados e veja exatamente como sua marca aparece em cada resposta.",
  },
  "/dashboard/acoes": {
    title: "Planos de Ação",
    description:
      "Receba planos estratégicos personalizados para destravar pontos fracos e consolidar pilares fortes.",
  },
  "/dashboard/conteudo": {
    title: "Gerador de Conteúdo Estratégico",
    description:
      "Crie artigos, FAQs e resumos otimizados para serem citados pelas IAs — gerados a partir do diagnóstico da sua marca.",
  },
  "/dashboard/prompts": {
    title: "Mapa de Prompts",
    description:
      "Mapa completo dos prompts estratégicos do seu setor — os que decidem indicação, comparação e fechamento.",
  },
  "/dashboard/alertas": {
    title: "Alertas",
    description:
      "Receba avisos no momento em que uma IA muda como recomenda sua marca — antes do concorrente reagir.",
  },
  "/dashboard/campanhas": {
    title: "Campanhas",
    description:
      "Crie campanhas direcionadas para aumentar menções, melhorar score e ganhar presença em IAs específicas.",
  },
  "/dashboard/relatorios": {
    title: "Relatórios",
    description:
      "Exporte relatórios executivos em PDF e XLSX com os dados de presença, score, sentimento e evolução.",
  },
};

export function getLockedRouteInfo(pathname: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  // Match exato; rotas como /dashboard/campanhas/nova caem no /campanhas
  if (LOCKED_ROUTE_INFO[path]) return LOCKED_ROUTE_INFO[path];
  // fallback para sub-rotas (ex: /dashboard/campanhas/nova)
  const parent = Object.keys(LOCKED_ROUTE_INFO).find((k) =>
    path.startsWith(k + "/"),
  );
  if (parent) return LOCKED_ROUTE_INFO[parent];
  return {
    title: "Recurso premium",
    description:
      "Este recurso faz parte dos planos pagos. Faça upgrade para liberar acesso completo.",
  };
}

// =====================================================================
// Feature gating por plano (Presença / Influência / Autoridade)
// =====================================================================
// Mapeamento explícito de rota -> tier mínimo necessário. Rotas que NÃO
// aparecem aqui ficam liberadas para qualquer usuário pago (não regredimos
// nada que já estava acessível). Trial espelha o plano escolhido.
//
// ALWAYS_ALLOWED = rotas que ignoram o gating de plano por completo
// (núcleo do produto + administração da conta + alertas).

export type PlanoTier = "presenca" | "influencia" | "autoridade";

export const TIER_ORDER: readonly PlanoTier[] = [
  "presenca",
  "influencia",
  "autoridade",
];

const TIER_INDEX: Record<PlanoTier, number> = {
  presenca: 0,
  influencia: 1,
  autoridade: 2,
};

export const ALWAYS_ALLOWED: readonly string[] = [
  "/dashboard",
  "/dashboard/diagnostico",
  "/dashboard/configuracoes",
  "/dashboard/assinatura",
  "/dashboard/ajuda",
  "/dashboard/alertas",
];

export const ROUTE_MIN_TIER: Record<string, PlanoTier> = {
  // Presença
  "/dashboard/score": "presenca",
  "/dashboard/auditorias": "presenca",
  "/dashboard/conteudo": "presenca",
  "/dashboard/tags-percepcao": "presenca",
  "/dashboard/monitoramento": "presenca",
  "/dashboard/llms-txt": "presenca",
  // Influência
  "/dashboard/dominancia": "influencia",
  "/dashboard/sentimento": "influencia",
  "/dashboard/comparativo": "influencia",
  "/dashboard/pilares": "influencia",
  "/dashboard/campanhas": "influencia",
  // Autoridade
  "/dashboard/simulador": "autoridade",
  "/dashboard/prompts": "autoridade",
  "/dashboard/acoes": "autoridade",
  "/dashboard/relatorios": "autoridade",
  "/dashboard/prompt-tester": "autoridade",
};

function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
}

export function getRequiredTier(pathname: string): PlanoTier | null {
  const path = normalizePath(pathname);
  if (ROUTE_MIN_TIER[path]) return ROUTE_MIN_TIER[path];
  // sub-rotas herdam o tier do pai (ex: /dashboard/campanhas/nova)
  const parent = Object.keys(ROUTE_MIN_TIER).find((k) =>
    path.startsWith(k + "/"),
  );
  return parent ? ROUTE_MIN_TIER[parent] : null;
}

export function tierLabel(tier: PlanoTier): string {
  switch (tier) {
    case "presenca":
      return "Presença";
    case "influencia":
      return "Influência";
    case "autoridade":
      return "Autoridade";
  }
}

/**
 * Verifica se o usuário tem acesso à feature/rota informada considerando
 * seu plano atual. Admin sempre passa. Rotas em ALWAYS_ALLOWED sempre passam.
 * Rotas não mapeadas em ROUTE_MIN_TIER liberam para qualquer usuário pago/trial.
 */
export function isFeatureAvailable(
  pathname: string,
  plano: PlanoTier | null,
  isPaid: boolean,
  isAdmin: boolean,
  isTrial: boolean,
): boolean {
  if (isAdmin) return true;
  const path = normalizePath(pathname);
  if (ALWAYS_ALLOWED.includes(path)) return true;
  if (path.startsWith("/dashboard/admin")) return false;

  const required = getRequiredTier(path);
  if (!required) return isPaid || isTrial;

  if (!plano) return false;
  if (!isPaid && !isTrial) return false;
  return TIER_INDEX[plano] >= TIER_INDEX[required];
}
