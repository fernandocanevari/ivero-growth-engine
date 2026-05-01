import type { BlogPost } from "./types";

export const post: BlogPost = {
  slug: "ai-influence-score",
  title: "AI Influence Score: o novo KPI que substitui o ranking do Google",
  description:
    "Posição no Google deixou de ser proxy de visibilidade. O AI Influence Score mede de 0 a 100 quão presente, positiva e autoritativa sua marca é dentro das respostas das IAs generativas.",
  keywords: [
    "AI Influence Score",
    "KPI",
    "Generative Engine Optimization",
    "GEO",
    "ranking Google",
    "Ivero",
    "share of voice",
    "ChatGPT",
    "Gemini",
    "Perplexity",
  ],
  publishedAt: "2026-04-29",
  author: { name: "Equipe Ivero", role: "Product Strategy" },
  tags: ["Métricas", "Estratégia"],
  summary: [
    "AI Influence Score consolida 5 pilares (Presença, Sentimento, Posicionamento, Autoridade, Consistência) em um índice de 0 a 100.",
    "É calculado simultaneamente em 5 modelos de IA — não em um só.",
    "Substitui métricas obsoletas como posição média no Google e impressões.",
    "Permite comparação com concorrentes diretos no mesmo recorte temporal.",
  ],
  blocks: [
    {
      type: "paragraph",
      text: "Quando o ranking do Google era o único termômetro de visibilidade, bastava acompanhar posição média e CTR. Em 2026, com 30% das buscas migrando para IAs generativas, esse painel ficou cego para a metade da realidade. O AI Influence Score nasceu para preencher essa lacuna: um KPI único, de 0 a 100, que mede a influência real da sua marca dentro das respostas que as IAs entregam.",
    },
    {
      type: "heading",
      level: 2,
      text: "Os 5 pilares do AI Influence Score",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Presença — com que frequência sua marca é citada nas respostas relevantes.",
        "Sentimento — em qual tom (positivo, neutro, negativo) a marca aparece.",
        "Posicionamento — sua marca aparece como líder, alternativa ou nota de rodapé.",
        "Autoridade — quão confiável a IA considera a sua marca para o tema (quantas fontes confirmam).",
        "Consistência — a presença é uniforme entre os 5 modelos ou só aparece em alguns.",
      ],
    },
    {
      type: "paragraph",
      text: "Cada pilar é avaliado em 3 sub-critérios ponderados, gerando uma nota que é normalizada para a escala 0-100. O agregado final usa pesos específicos para cada setor (B2B SaaS pesa mais Posicionamento; varejo pesa mais Sentimento).",
    },
    {
      type: "heading",
      level: 2,
      text: "As 4 faixas estratégicas",
    },
    {
      type: "list",
      items: [
        "0-30 — Crítico: a marca é praticamente invisível para LLMs. Concorrentes ocupam o espaço. Risco alto de perder shortlist.",
        "31-55 — Insuficiente: a marca aparece de forma esparsa, geralmente em menções neutras ou comparações genéricas.",
        "56-80 — Sólido: presença consistente, sentimento positivo na maioria dos modelos. Posicionamento competitivo.",
        "81-100 — Referência: a marca é citada como autoridade do tema. Aparece em primeiro plano nas respostas — o sonho do GEO.",
      ],
    },
    {
      type: "callout",
      variant: "warning",
      title: "Atenção ao desvio padrão",
      text: "Um score médio de 70 com desvio alto entre IAs (80 no ChatGPT, 35 no Perplexity) indica fragilidade — a marca depende de uma única plataforma. Consistência é o pilar que separa marcas resilientes de marcas vulneráveis.",
    },
    {
      type: "heading",
      level: 2,
      text: "Por que substitui (não complementa) o ranking do Google",
    },
    {
      type: "paragraph",
      text: "Aqui está a tese desconfortável: posição no Google está virando uma métrica de processo, não de resultado. Você pode estar em primeiro lugar para uma keyword e nunca ser citado pela IA quando o usuário faz a mesma pergunta em linguagem natural. O destino final do tráfego mudou — e o KPI precisa mudar junto.",
    },
    {
      type: "paragraph",
      text: "Empresas que ainda reportam SEO sem reportar AI Influence Score estão entregando ao board uma fotografia parcial. Pior: estão alocando orçamento para um canal cuja relevância está em queda estrutural enquanto o canal em ascensão (LLMs) segue sem governança métrica.",
    },
    {
      type: "heading",
      level: 2,
      text: "Como o Ivero calcula o seu score",
    },
    {
      type: "paragraph",
      text: "Em uma análise, a Ivero dispara prompts padronizados para OpenAI, Gemini, Claude, Perplexity e Copilot em paralelo, captura as respostas e aplica o framework dos 5 pilares. O score é recalculado a cada nova auditoria (mensal por padrão, com cooldown de 30 dias) e armazenado para comparação histórica — você acompanha a evolução com gráficos de tendência.",
    },
    {
      type: "cta",
      text: "Calcule seu AI Influence Score agora — leva 60 segundos.",
      label: "Fazer diagnóstico grátis",
      href: "/#diagnostico",
    },
  ],
  faq: [
    {
      q: "O AI Influence Score é uma métrica padrão do mercado?",
      a: "É uma métrica proprietária da Ivero, mas o framework dos 5 pilares é alinhado a princípios discutidos por pesquisadores de NLP e marketing analítico (ex.: Stanford GEO Lab, Princeton AI Influence Working Group).",
    },
    {
      q: "Posso comparar meu score com o de um concorrente?",
      a: "Sim — esse é um dos casos de uso centrais. A Ivero permite cadastrar até 4 concorrentes diretos e gera um comparativo lado a lado nos 5 pilares e nos 5 modelos.",
    },
    {
      q: "Quanto tempo até meu score subir após implementar GEO?",
      a: "Movimentos visíveis em 30-60 dias para marcas iniciantes. Para marcas já estabelecidas, ganhos marginais (sair de 70 para 85) levam de 4 a 8 meses de cadência consistente.",
    },
    {
      q: "Score baixo significa que minha marca tem problema?",
      a: "Significa que ela tem invisibilidade na nova superfície de busca — o que vira problema rapidamente quando concorrentes investem em GEO. Marcas grandes com score abaixo de 40 estão em risco competitivo silencioso.",
    },
    {
      q: "Qual a diferença para o Share of Voice tradicional?",
      a: "Share of Voice mede menções em mídia (TV, jornal, redes). AI Influence Score mede a presença ativa nas respostas que a sua audiência consome via IA — um canal onde mídia comprada não atua.",
    },
  ],
  related: [
    "geo-vs-aeo-vs-aio",
    "como-marca-aparece-em-ias",
    "monitorar-ias-vs-google",
  ],
};
