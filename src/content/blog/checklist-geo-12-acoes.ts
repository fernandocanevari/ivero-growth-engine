import type { BlogPost } from "./types";

export const post: BlogPost = {
  slug: "checklist-geo-12-acoes",
  title: "Checklist GEO: 12 ações para sua marca ser citada por IAs em 2026",
  description:
    "Um roteiro tático em 12 passos — do conteúdo extraível por LLMs ao monitoramento de citações — para começar uma estratégia de GEO ainda este trimestre.",
  keywords: [
    "checklist GEO",
    "Generative Engine Optimization",
    "GEO",
    "AI Influence Score",
    "schema FAQPage",
    "Ivero",
    "ChatGPT",
    "Perplexity",
    "Gemini",
    "Claude",
  ],
  publishedAt: "2026-04-29",
  author: { name: "Equipe Ivero", role: "GEO Implementation" },
  tags: ["Tático", "GEO"],
  summary: [
    "Estrutura de conteúdo importa mais que volume — IAs extraem mais facilmente parágrafos curtos com bullets e FAQ.",
    "Schema markup (Article, FAQPage, Organization) ainda é decisivo para Gemini e Copilot.",
    "Cadência mensal supera grandes campanhas pontuais para construir autoridade temática.",
    "Sem monitoramento, GEO vira intuição — e intuição não escala.",
  ],
  blocks: [
    {
      type: "paragraph",
      text: "Estratégia sem execução é teoria. Reunimos as 12 ações com maior retorno em programas de GEO que acompanhamos no último ano. A ordem é deliberada: começa pelo que dá resultado em 30 dias e termina pelo que cria autoridade duradoura.",
    },
    {
      type: "heading",
      level: 2,
      text: "Fundação (semanas 1-2)",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Audite onde sua marca aparece hoje em ChatGPT, Gemini, Perplexity, Claude e Copilot — descubra a linha de base do AI Influence Score.",
        "Mapeie 10-15 perguntas que seu público-alvo faz às IAs sobre o seu mercado (use ferramentas como AnswerThePublic + ajuste manual).",
        "Identifique 3 concorrentes que aparecem mais que você nessas perguntas e analise as fontes citadas por trás (Perplexity facilita).",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Conteúdo extraível (semanas 3-6)",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Reescreva sua landing page principal com um resumo executivo de 3-4 bullets no topo (formato que IAs amam citar).",
        "Crie uma página por pergunta-chave do mapeamento, com FAQ no final e schema FAQPage marcado.",
        "Publique um artigo pilar de 1.500-2.500 palavras por mês com estrutura clara (H2 numerados, listas ordenadas, dados objetivos).",
        "Inclua tabelas comparativas — IAs as transformam em respostas quase ipsis litteris.",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Autoridade externa (semanas 6-12)",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Garanta menções em 3-5 publicações que aparecem como fonte recorrente no seu setor (PR direcionado para sites que LLMs consomem).",
        "Crie ou atualize verbetes na Wikipedia, Wikidata e Crunchbase — Gemini e Claude consultam esses agressivamente.",
        "Distribua conteúdo em formatos que IAs absorvem: posts no LinkedIn (longos, com bullets), threads no X, papers no SSRN ou Medium.",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Governança contínua (mensal)",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Reaudite o AI Influence Score a cada 30 dias e acompanhe o delta por pilar.",
        "Configure alertas para mudanças de sentimento ou perda súbita de presença em alguma IA específica.",
      ],
    },
    {
      type: "callout",
      variant: "success",
      title: "Resultado esperado",
      text: "Marcas que executam o checklist com disciplina costumam sair de scores 30-45 para 65-80 em 4-6 meses, com inflexão visível a partir da semana 8.",
    },
    {
      type: "cta",
      text: "Pronto para executar? Comece pela ação #1 — auditoria gratuita do seu AI Influence Score.",
      label: "Fazer diagnóstico grátis",
      href: "/preview",
    },
  ],
  faq: [
    {
      q: "Preciso de orçamento alto para começar GEO?",
      a: "Não. As primeiras 6 ações são executadas com a equipe de marketing existente em 4-6 semanas. O custo entra quando se contrata PR, ferramentas de monitoramento ou produção de conteúdo em escala.",
    },
    {
      q: "Schema markup ainda importa em 2026?",
      a: "Importa muito para Gemini e Copilot, que dependem do índice do Google. Para Perplexity e Claude, importa menos — eles processam o texto cru.",
    },
    {
      q: "Quantos artigos por mês são suficientes?",
      a: "Um artigo pilar (1.500+ palavras) + 4 a 6 conteúdos satélites menores. Cadência > volume.",
    },
    {
      q: "Como saber se minhas ações estão funcionando?",
      a: "Mede-se pelo AI Influence Score em ciclos de 30 dias. Se o score sobe e o sentimento melhora, está funcionando. Se estagna por 60+ dias, é hora de revisar a estratégia de fontes.",
    },
    {
      q: "Posso usar IA para escrever o conteúdo GEO?",
      a: "Pode usar como base, mas precisa de revisão humana especialista — IAs detectam (e penalizam) conteúdo que parece gerado por outra IA sem valor agregado. A receita: estrutura por IA, originalidade e dados por humano.",
    },
  ],
  related: [
    "geo-vs-aeo-vs-aio",
    "ai-influence-score",
    "como-marca-aparece-em-ias",
  ],
};
