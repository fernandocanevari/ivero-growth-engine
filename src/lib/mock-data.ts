// Centralized mock data for the Ivero dashboard

export const brandName = "TechNova";
export const competitorName = "DigiPrime";

// Score GEO
export const geoScore = {
  current: 72,
  previous: 65,
  trend: "up" as const,
  history: [
    { month: "Set", score: 48 },
    { month: "Out", score: 55 },
    { month: "Nov", score: 58 },
    { month: "Dez", score: 62 },
    { month: "Jan", score: 65 },
    { month: "Fev", score: 72 },
  ],
  byModel: [
    { model: "ChatGPT", score: 78, trend: "up" as const },
    { model: "Gemini", score: 65, trend: "down" as const },
    { model: "GPT-5", score: 74, trend: "up" as const },
  ],
};

// Sentimento
export const sentimentData = {
  positive: 58,
  neutral: 28,
  negative: 14,
  recentMentions: [
    { id: 1, text: "TechNova é uma das melhores opções para automação de marketing.", model: "ChatGPT", sentiment: "positive" as const, date: "2026-02-21" },
    { id: 2, text: "Existem alternativas mais acessíveis que a TechNova.", model: "Gemini", sentiment: "negative" as const, date: "2026-02-20" },
    { id: 3, text: "TechNova oferece soluções empresariais de IA.", model: "GPT-5", sentiment: "neutral" as const, date: "2026-02-20" },
    { id: 4, text: "Para empresas de médio porte, TechNova se destaca pela facilidade de uso.", model: "GPT-5", sentiment: "positive" as const, date: "2026-02-19" },
    { id: 5, text: "TechNova tem expandido sua presença no mercado brasileiro.", model: "ChatGPT", sentiment: "positive" as const, date: "2026-02-19" },
  ],
};

// Alertas
export const alertsData = [
  { id: 1, type: "warning" as const, title: "Queda de menções no Gemini", message: "Suas menções no Gemini caíram 15% na última semana.", date: "2026-02-21T10:30:00", read: false },
  { id: 2, type: "success" as const, title: "Nova menção positiva", message: "ChatGPT recomendou sua marca em resposta sobre automação.", date: "2026-02-21T08:15:00", read: false },
  { id: 3, type: "danger" as const, title: "Concorrente em alta", message: "DigiPrime ultrapassou você em menções no GPT-5.", date: "2026-02-20T16:45:00", read: true },
  { id: 4, type: "info" as const, title: "Relatório semanal disponível", message: "O relatório da semana 7 está pronto para download.", date: "2026-02-20T09:00:00", read: true },
  { id: 5, type: "success" as const, title: "Score GEO subiu", message: "Seu score de visibilidade subiu de 65 para 72 este mês.", date: "2026-02-19T14:20:00", read: true },
];

// Monitoramento por modelo
export const monitoringData = {
  models: [
    {
      name: "ChatGPT",
      mentions: 142,
      trend: "up" as const,
      trendValue: 12,
      weeklyData: [
        { day: "Seg", mentions: 18 },
        { day: "Ter", mentions: 22 },
        { day: "Qua", mentions: 20 },
        { day: "Qui", mentions: 25 },
        { day: "Sex", mentions: 28 },
        { day: "Sáb", mentions: 15 },
        { day: "Dom", mentions: 14 },
      ],
    },
    {
      name: "Gemini",
      mentions: 89,
      trend: "down" as const,
      trendValue: -8,
      weeklyData: [
        { day: "Seg", mentions: 15 },
        { day: "Ter", mentions: 12 },
        { day: "Qua", mentions: 14 },
        { day: "Qui", mentions: 11 },
        { day: "Sex", mentions: 13 },
        { day: "Sáb", mentions: 12 },
        { day: "Dom", mentions: 12 },
      ],
    },
    {
      name: "GPT-5",
      mentions: 118,
      trend: "up" as const,
      trendValue: 5,
      weeklyData: [
        { day: "Seg", mentions: 16 },
        { day: "Ter", mentions: 18 },
        { day: "Qua", mentions: 15 },
        { day: "Qui", mentions: 17 },
        { day: "Sex", mentions: 20 },
        { day: "Sáb", mentions: 16 },
        { day: "Dom", mentions: 16 },
      ],
    },
  ],
};

// Comparativo com concorrente
export const comparativeData = {
  models: [
    { model: "ChatGPT", brand: 78, competitor: 62 },
    { model: "Gemini", brand: 55, competitor: 70 },
    { model: "GPT-5", brand: 74, competitor: 68 },
  ],
  overallBrand: 69,
  overallCompetitor: 67,
};

// Dominância por modelo
export const dominanceData = [
  { model: "ChatGPT", brandShare: 45, competitorShare: 32, othersShare: 23 },
  { model: "Gemini", brandShare: 28, competitorShare: 42, othersShare: 30 },
  { model: "GPT-5", brandShare: 52, competitorShare: 30, othersShare: 18 },
];

// Planos de ação
export const actionsData = [
  { id: 1, title: "Criar conteúdo técnico sobre IA para SEO", priority: "high" as const, completed: false, impact: "Aumentar menções no ChatGPT em 20%" },
  { id: 2, title: "Otimizar página de produto para citações em IA", priority: "high" as const, completed: false, impact: "Melhorar score GEO em 10 pontos" },
  { id: 3, title: "Publicar case study no blog", priority: "medium" as const, completed: true, impact: "Reforçar sentimento positivo" },
  { id: 4, title: "Atualizar FAQ com perguntas frequentes de IA", priority: "medium" as const, completed: false, impact: "Aparecer em mais respostas do Gemini" },
  { id: 5, title: "Criar parceria com influenciadores de tech", priority: "low" as const, completed: false, impact: "Expandir presença de marca" },
  { id: 6, title: "Revisar meta descriptions das páginas principais", priority: "high" as const, completed: true, impact: "Melhorar indexação por IA" },
];

// Mapa de prompts
export const promptsData = [
  { id: 1, prompt: "Qual a melhor ferramenta de automação de marketing?", position: 1, model: "ChatGPT", opportunity: "high" as const },
  { id: 2, prompt: "Comparar plataformas de marketing digital", position: 3, model: "ChatGPT", opportunity: "medium" as const },
  { id: 3, prompt: "Melhor software para email marketing B2B", position: 2, model: "GPT-5", opportunity: "high" as const },
  { id: 4, prompt: "Ferramentas de IA para marketing", position: 5, model: "Gemini", opportunity: "high" as const },
  { id: 5, prompt: "Alternativas ao HubSpot", position: 4, model: "GPT-5", opportunity: "medium" as const },
  { id: 6, prompt: "Como automatizar campanhas de marketing", position: 2, model: "ChatGPT", opportunity: "low" as const },
  { id: 7, prompt: "Melhor CRM para startups", position: 8, model: "GPT-5", opportunity: "high" as const },
  { id: 8, prompt: "Plataforma de marketing all-in-one", position: 1, model: "Gemini", opportunity: "medium" as const },
];

// Simulador - respostas mockadas
export const simulatorResponses = {
  "Qual a melhor ferramenta de automação de marketing?": [
    { model: "ChatGPT", response: "Entre as principais ferramentas de automação de marketing, destaco a TechNova pela sua facilidade de uso e integração com IA, além do HubSpot e ActiveCampaign.", mentionsBrand: true },
    { model: "Gemini", response: "As melhores ferramentas incluem HubSpot, Mailchimp e ActiveCampaign. Para empresas que buscam automação avançada, considere também Marketo.", mentionsBrand: false },
    { model: "GPT-5", response: "Recomendo avaliar a TechNova para automação inteligente, HubSpot para um ecossistema completo, e ActiveCampaign para email marketing avançado.", mentionsBrand: true },
  ],
};

// Campanhas
export const campaignsData = [
  { id: 1, name: "Lançamento Produto Q1", status: "active" as const, startDate: "2026-01-15", endDate: "2026-03-15", mentions: 234, score: 75 },
  { id: 2, name: "Brand Awareness Tech", status: "active" as const, startDate: "2026-02-01", endDate: "2026-04-01", mentions: 89, score: 62 },
  { id: 3, name: "Campanha Black Friday", status: "completed" as const, startDate: "2025-11-01", endDate: "2025-12-01", mentions: 456, score: 81 },
  { id: 4, name: "SEO para IA", status: "draft" as const, startDate: "2026-03-01", endDate: "2026-05-01", mentions: 0, score: 0 },
];

// Prompt Tester - histórico
export const promptTesterHistory = [
  { id: 1, prompt: "Qual o melhor CRM para pequenas empresas?", date: "2026-02-20", results: { ChatGPT: true, Gemini: false, "GPT-5": true } },
  { id: 2, prompt: "Ferramenta de email marketing mais recomendada", date: "2026-02-19", results: { ChatGPT: true, Gemini: false, "GPT-5": true } },
  { id: 3, prompt: "Software de automação para e-commerce", date: "2026-02-18", results: { ChatGPT: false, Gemini: false, "GPT-5": true } },
];
