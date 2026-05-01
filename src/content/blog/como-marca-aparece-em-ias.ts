import type { BlogPost } from "./types";

export const post: BlogPost = {
  slug: "como-marca-aparece-em-ias",
  title: "Como sua marca aparece (ou some) no ChatGPT, Gemini e Perplexity",
  description:
    "Cada IA constrói respostas com critérios próprios. Entenda como ChatGPT, Gemini, Perplexity, Claude e Copilot decidem citar sua marca — e o que fazer quando ela some do radar.",
  keywords: [
    "ChatGPT",
    "Gemini",
    "Perplexity",
    "Claude",
    "Copilot",
    "Generative Engine Optimization",
    "GEO",
    "AI Influence Score",
    "Ivero",
    "citação por IA",
    "auditoria de IA",
  ],
  publishedAt: "2026-04-29",
  author: { name: "Equipe Ivero", role: "AI Influence Research" },
  tags: ["Monitoramento", "GEO"],
  summary: [
    "ChatGPT prioriza fontes treinadas e plugins de busca em tempo real (Bing).",
    "Perplexity é o mais transparente: mostra fontes citadas em cada resposta.",
    "Gemini integra o Knowledge Graph do Google e dá peso a domínios autoritativos.",
    "Claude tende a ser conservador: cita menos marcas, mas quando cita confia mais.",
  ],
  blocks: [
    {
      type: "paragraph",
      text: "Pergunte a três IAs diferentes a mesma coisa — 'quais são as melhores plataformas de auditoria de marca em IA?' — e você vai receber três respostas distintas, com marcas diferentes, ordens diferentes e tons diferentes. Isso não é aleatoriedade: cada modelo tem critérios próprios para escolher quais marcas citar. Entender esses critérios é o primeiro passo para uma estratégia de GEO eficaz.",
    },
    {
      type: "heading",
      level: 2,
      text: "ChatGPT (OpenAI): a IA mais usada, a mais difícil de prever",
    },
    {
      type: "paragraph",
      text: "O ChatGPT mistura duas fontes: o conhecimento treinado até a data de corte do modelo e, quando o modo de busca está ativo, resultados em tempo real do Bing. Marcas que apareciam de forma consistente na web pré-2023 ainda colhem benefícios. Marcas novas precisam ser citadas por sites confiáveis no índice do Bing para entrar no radar.",
    },
    {
      type: "callout",
      variant: "info",
      title: "Sinal claro",
      text: "Se sua marca não aparece no ChatGPT mesmo após perguntas específicas, o problema raramente é o modelo: é a sua presença em fontes que ele consulta. Comece auditando suas menções no Bing.",
    },
    {
      type: "heading",
      level: 2,
      text: "Perplexity: a IA mais transparente — e a mais auditável",
    },
    {
      type: "paragraph",
      text: "Perplexity é o sonho de quem trabalha com GEO. Cada resposta vem com as fontes citadas explicitamente, em ordem de relevância. Isso permite engenharia reversa: você descobre exatamente quais artigos, sites e páginas o modelo está usando para falar do seu mercado — e pode criar conteúdo direcionado àquelas fontes.",
    },
    {
      type: "paragraph",
      text: "É também a IA mais sensível a conteúdo recente. Publicações dos últimos 60 dias têm peso desproporcional nas respostas, o que cria uma janela de oportunidade para marcas que mantêm cadência editorial.",
    },
    {
      type: "heading",
      level: 2,
      text: "Gemini (Google): autoridade de domínio importa mais aqui",
    },
    {
      type: "paragraph",
      text: "O Gemini bebe direto do Knowledge Graph do Google e do índice de busca, então as variáveis clássicas de SEO (autoridade de domínio, backlinks, schema markup) ainda pesam muito. Marcas com forte presença no Google se traduzem naturalmente em presença no Gemini — mas com a diferença de que Gemini tende a sintetizar e parafrasear, raramente nomeando a marca diretamente a menos que ela seja a autoridade clara do tema.",
    },
    {
      type: "heading",
      level: 2,
      text: "Claude (Anthropic): o crítico exigente",
    },
    {
      type: "paragraph",
      text: "Claude é treinado com forte ênfase em segurança e cautela. Na prática, isso significa que ele cita menos marcas por resposta e tende a apresentar comparações genéricas ('plataformas como X, Y e Z fazem isso') em vez de recomendações diretas. Quando ele decide citar uma marca específica, o sinal de autoridade é forte — mas a barreira de entrada é alta.",
    },
    {
      type: "heading",
      level: 2,
      text: "Copilot (Microsoft): o ChatGPT corporativo",
    },
    {
      type: "paragraph",
      text: "Copilot usa GPT-4 com integração profunda ao Bing e ao ecossistema Microsoft 365. Para marcas B2B, é talvez o canal mais subestimado: decisores em empresas corporativas usam Copilot por padrão dentro do Word, Excel e Teams. Aparecer aqui é aparecer no contexto onde a decisão de compra está sendo escrita.",
    },
    {
      type: "heading",
      level: 2,
      text: "O que fazer quando sua marca some do radar",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Audite a presença em cada IA separadamente — a Ivero faz isso em paralelo nos 5 modelos.",
        "Identifique em qual delas há lacuna crítica (zero menções) e em quais há posicionamento fraco.",
        "Mapeie as fontes que aparecem nas respostas dos concorrentes (Perplexity facilita).",
        "Produza conteúdo direcionado às mesmas fontes, com formato extraível por LLMs (resumos, FAQ, dados objetivos).",
        "Reaudite a cada 30 dias e acompanhe o AI Influence Score subir.",
      ],
    },
    {
      type: "cta",
      text: "Descubra em 60 segundos como sua marca aparece nas 5 principais IAs.",
      label: "Auditar minha marca agora",
      href: "/#diagnostico",
    },
  ],
  faq: [
    {
      q: "Por que minha marca aparece no ChatGPT mas não no Perplexity?",
      a: "Provavelmente seu conteúdo está bem indexado no treinamento histórico do GPT mas você não tem publicações recentes citadas em fontes que o Perplexity prioriza (mídia, blogs especializados, papers).",
    },
    {
      q: "Posso pagar para aparecer em uma IA específica?",
      a: "Não no sentido de mídia paga. Não existe (ainda) leilão de citações em LLMs. A única forma é orgânica — produzir conteúdo de qualidade nas fontes que cada IA consulta.",
    },
    {
      q: "Quantas vezes preciso ser citado para construir presença consistente?",
      a: "Como referência: 5 a 10 menções qualificadas por mês em fontes relevantes começam a mover o ponteiro em 90 dias. Marcas líderes mantêm 30+ menções mensais.",
    },
    {
      q: "Devo focar em uma IA específica primeiro?",
      a: "Depende do seu público. B2C generalista: priorize ChatGPT e Gemini. B2B técnico: ChatGPT, Perplexity e Copilot. Setor regulado (saúde, jurídico): Claude tem peso desproporcional pela cautela editorial.",
    },
    {
      q: "Como o Ivero monitora as 5 IAs simultaneamente?",
      a: "Usamos uma Edge Function que dispara prompts padronizados em paralelo para OpenAI, Gemini, Claude, Perplexity e Copilot, e consolida as respostas em métricas comparáveis (citação, sentimento, contexto, posicionamento).",
    },
  ],
  related: ["geo-vs-aeo-vs-aio", "ai-influence-score", "monitorar-ias-vs-google"],
};
