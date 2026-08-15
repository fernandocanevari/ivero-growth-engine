// Fonte única de verdade da COPY da landing page (/).
//
// Consumidores:
//  - Componentes em src/components/landing/* (renderização React)
//  - src/lib/landing-md.ts (serializador Markdown) → vite-plugin-landing-md.ts
//    gera public/landing.md em dev e build.
//
// Regra: nenhum texto visível da landing deve ser escrito inline no JSX.
// Ícones, cores e mockups continuam nos componentes (decoração, não conteúdo).
// Preços/planos NÃO vivem aqui — vêm de src/lib/pricing-rules.ts.

export const LANDING_META = {
  siteUrl: "https://ivero.com.br",
  title: "Ivero — Descubra se sua marca está invisível para as IAs",
  description:
    "A Ivero audita como sua marca aparece (ou não) no ChatGPT, Gemini, Google Modo IA e Claude. Diagnóstico instantâneo de visibilidade em IA.",
} as const;

/* ── Hero ── */

export const HERO = {
  headline: {
    before: "Sua marca pode estar ",
    highlight: "invisível agora",
    after: " para o seu cliente e você não sabe.",
  },
  subheadline: {
    p1: "A Ivero mostra como sua marca",
    pill1: "aparece",
    p2: "nas respostas das IAs, se é",
    pill2: "🏆 recomendada",
    p3: "antes do concorrente, e qual é o seu",
    pill3: "💡 plano de ação",
    p4: "pra virar referência.",
  },
  inputPlaceholder: "Ex.: www.suaempresa.com.br",
  ctaLabel: "Descobrir minha visibilidade agora",
  note: "Diagnóstico instantâneo. Sem cadastro, sem enrolação.",
} as const;

/* ── Problema ── */

export const PROBLEM = {
  headline: { before: "As IAs reconhecem ", highlight: "sua marca?" },
  subheadline:
    "Quando a IA não cita sua marca, a escolha do seu cliente vai para outro lugar.",
  ctaLabel: "Descubra como sua marca aparece na IA",
  items: [
    {
      key: "invisibilidade",
      title: "Invisibilidade nas IAs",
      description:
        "Quando alguém pergunta ao ChatGPT, Gemini ou Google Modo IA sobre seu setor, sua marca simplesmente não aparece.",
    },
    {
      key: "concorrentes",
      title: "Concorrentes sendo recomendados",
      description:
        "Enquanto você não monitora, IAs generativas estão recomendando seus concorrentes em vez da sua marca.",
    },
    {
      key: "decisoes",
      title: "Decisões sem dados de IA",
      description:
        "Sem entender como as IAs percebem sua marca, suas estratégias de conteúdo e posicionamento são cegas.",
    },
  ],
} as const;

/* ── Passos ── */

export const STEPS = {
  headline: { before: "3 passos para ", highlight: "dominar a IA" },
  items: [
    {
      key: "monitorar",
      number: "01",
      title: "Monitore as respostas",
      description:
        "A Ivero consulta as principais IAs generativas (ChatGPT, Gemini e Google Modo IA com grounding em tempo real do Google) com perguntas reais do seu setor e registra se sua marca aparece — e como aparece.",
    },
    {
      key: "analisar",
      number: "02",
      title: "Analise e compare",
      description:
        "Receba dashboards com análises comparativas: visibilidade da sua marca vs concorrentes, sentimento, contexto de citação e evolução ao longo do tempo.",
    },
    {
      key: "agir",
      number: "03",
      title: "Aja com precisão",
      description:
        "A Ivero gera planos de ação estratégicos para melhorar o posicionamento da sua marca nas respostas de IAs generativas. Decisões baseadas em dados, não em suposições.",
    },
  ],
} as const;

/* ── Recursos ── */

export const FEATURES = {
  headline: {
    before: "Recursos da Ivero para ",
    highlight: "a presença da sua marca nas IAs",
  },
  items: [
    {
      key: "monitoring",
      title: "Monitoramento Multi-IA",
      description:
        "Rastreie menções da sua marca no ChatGPT, Gemini e Google Modo IA, os motores generativos com maior alcance.",
    },
    {
      key: "compare",
      title: "Análise Comparativa",
      description:
        "Compare sua visibilidade com concorrentes diretos em cada motor de IA.",
    },
    {
      key: "score",
      title: "Score de Visibilidade GEO",
      description:
        "Métrica proprietária de 0 a 100 que quantifica sua presença nas respostas de IA.",
    },
    {
      key: "sentiment",
      title: "Análise de Sentimento",
      description:
        "Entenda se a IA fala da sua marca de forma positiva, neutra ou negativa.",
    },
    {
      key: "actions",
      title: "Planos de Ação Estratégicos",
      description:
        "Receba recomendações prescritivas para melhorar sua presença em IA.",
    },
    {
      key: "alerts",
      title: "Alertas em Tempo Real",
      description:
        "Seja notificado quando houver mudanças na forma como IAs citam sua marca.",
    },
    {
      key: "prompts",
      title: "Mapa de Prompts Estratégicos",
      description:
        "Descubra quais perguntas fazem sua marca aparecer — e quais não fazem.",
    },
    {
      key: "dominance",
      title: "Dominância por Modelo de IA",
      description:
        "Compare sua visibilidade no ChatGPT, Gemini e Google Modo IA — lado a lado com seus concorrentes.",
    },
    {
      key: "simulator",
      title: "Simulador de Influência em IA",
      description:
        "Teste perguntas reais e veja como cada modelo responde sobre sua marca — em tempo real.",
    },
  ],
} as const;

/* ── CTA intermediário ── */

export const CTA_SECTION = {
  headline: {
    before: "Sua marca será ",
    highlight: "lembrada ou esquecida?",
  },
  paragraph:
    "Milhões de decisões de compra já passam pelas IAs generativas. Garanta que sua marca esteja presente quando alguém perguntar.",
  ctaLabel: "Queremos você como cliente — Comece agora",
  stats: [
    {
      key: "consumidores",
      value: "75%",
      label: "dos consumidores já usam IA para pesquisar antes de comprar",
    },
    {
      key: "buscas",
      value: "40%",
      label: "das buscas por produtos começam em IAs generativas",
    },
    {
      key: "conversao",
      value: "3x",
      label: "mais chances de conversão quando a marca é citada pela IA",
    },
  ],
} as const;

/* ── Para quem ── */

export const AUDIENCE = {
  headline: {
    before: "A Ivero é para marcas que querem ser ",
    highlight: "relevante nas IA's",
  },
  items: [
    { key: "marcas", strong1: "Marcas", middle: " que querem ser ", strong2: "referências" },
    {
      key: "agencias",
      strong1: "Agências de MKT",
      middle: " que querem vender o ",
      strong2: "futuro",
    },
    {
      key: "ecommerce",
      strong1: "E-commerce",
      middle: " que querem ser ",
      strong2: "recomendados",
    },
    {
      key: "varejo",
      strong1: "Varejo",
      middle: " que quer dominar a nova ",
      strong2: "vitrine digital",
    },
  ],
} as const;

/* ── Planos (copy; valores em pricing-rules.ts) ── */

export const PRICING_COPY = {
  headline: { before: "Nossos ", highlight: "Planos" },
  ctaByPlan: {
    presenca: "Quero ser visto pelas IAs →",
    influencia: "Quero superar meus concorrentes →",
    autoridade: "Quero dominar meu setor nas IAs →",
  },
  guarantee: {
    titleBefore: "Incluso em ",
    titleHighlight: "todos os planos",
    benefits: [
      "Score GEO",
      "Monitoramento de IAs",
      "Alertas de menções",
      "Relatório semanal",
      "Suporte prioritário",
      "Onboarding Ivero",
    ],
    footnoteParts: [
      "Sem fidelidade",
      "Cancele quando quiser",
      "Evolua conforme sua operação cresce",
    ],
  },
} as const;

/* ── FAQ ── */

export const FAQ = {
  headline: { before: "Perguntas ", highlight: "Frequentes" },
  items: [
    {
      key: "geo",
      question: "O que é GEO (Generative Engine Optimization)?",
      answer:
        "GEO é a disciplina de otimizar a presença e visibilidade de uma marca nas respostas geradas por IAs como ChatGPT, Gemini e Google Modo IA (Gemini com grounding em tempo real). Diferente do SEO tradicional, que foca em buscadores, o GEO garante que sua marca seja recomendada quando usuários fazem perguntas diretamente a assistentes de IA.",
    },
    {
      key: "como-monitora",
      question: "Como a Ivero monitora as respostas das IAs?",
      answer:
        "A Ivero realiza consultas estratégicas e contínuas às principais IAs generativas do mercado, analisando se sua marca aparece, como é mencionada, qual o sentimento associado e como se posiciona frente aos concorrentes. Tudo isso é transformado em dados acionáveis no seu painel.",
    },
    {
      key: "quais-ias",
      question: "Quais IAs a Ivero monitora?",
      answer:
        "No MVP monitoramos as três IAs com maior alcance hoje: ChatGPT (OpenAI), Gemini (Google) e Google Modo IA (Gemini com grounding de busca em tempo real). Claude, Perplexity, GPT-5 e Copilot estão no roadmap para as próximas fases.",
    },
    {
      key: "score",
      question: "O que é o GEO Visibility Score?",
      answer:
        "É uma pontuação exclusiva da Ivero que mede de 0 a 100 o quanto sua marca é visível e bem posicionada nas respostas de IAs generativas. Ele considera frequência de menções, sentimento, posição nas respostas e comparação com concorrentes.",
    },
    {
      key: "substitui-seo",
      question: "A Ivero substitui ferramentas de SEO?",
      answer:
        "Não. A Ivero complementa sua estratégia de SEO. Enquanto o SEO otimiza sua presença nos buscadores tradicionais, o GEO garante que você também esteja visível no novo canal de descoberta: as respostas de IAs generativas. Juntos, eles cobrem todo o ecossistema de busca.",
    },
    {
      key: "tempo-resultados",
      question: "Quanto tempo leva para ver resultados?",
      answer:
        "Você terá acesso ao seu primeiro diagnóstico de visibilidade em até 24 horas após configurar sua conta. Os planos de ação estratégicos são gerados automaticamente, e melhorias na visibilidade podem ser observadas em semanas, dependendo da implementação das recomendações.",
    },
    {
      key: "concorrentes",
      question: "Posso monitorar meus concorrentes?",
      answer:
        "Sim! A Ivero permite adicionar concorrentes ao seu painel para análise comparativa. Você verá lado a lado como sua marca e os concorrentes aparecem nas respostas de IA, identificando oportunidades e ameaças em tempo real.",
    },
    {
      key: "tipos-empresa",
      question: "A Ivero é indicada para quais tipos de empresa?",
      answer:
        "A Ivero atende marcas de todos os portes, agências de marketing digital, e-commerces e equipes de SEO/conteúdo que desejam se antecipar à transformação na forma como consumidores descobrem produtos e serviços através de IAs.",
    },
  ],
} as const;

/* ── Rodapé ── */

export const FOOTER_COPY = {
  brand: "Ivero",
  tagline: "Visibilidade constrói marcas duradoras.",
  columns: [
    {
      title: "Empresa",
      links: [
        { label: "Blog", href: "/blog" },
        { label: "Diagnóstico", href: "/preview" },
      ],
    },
    {
      title: "Produto",
      links: [
        { label: "Recursos", href: "/#recursos" },
        { label: "Como funciona", href: "/#como-funciona" },
        { label: "Para quem", href: "/#para-quem" },
        { label: "Preços", href: "/#precos" },
      ],
    },
    {
      title: "Conta",
      links: [
        { label: "Entrar", href: "/auth" },
        { label: "Criar conta", href: "/auth" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Central Legal", href: "/legal" },
        { label: "Termos", href: "/termos-de-uso" },
        { label: "Privacidade", href: "/politica-de-privacidade" },
        { label: "Cookies", href: "/politica-de-cookies" },
      ],
    },
    {
      title: "Para IA",
      links: [
        { label: "Versão em Markdown desta página", href: "/landing.md" },
      ],
    },
  ],
  copyright: "© 2026 Ivero. Todos os direitos reservados.",
  founderCta: "Falar com o fundador da Ivero!",
  madeWith: "Feito com o coração ❤️",
} as const;

/** Helper: junta headline dividida em partes num texto simples (para Markdown). */
export function plainHeadline(h: { before: string; highlight: string; after?: string }): string {
  return `${h.before}${h.highlight}${h.after ?? ""}`.replace(/\s+/g, " ").trim();
}
