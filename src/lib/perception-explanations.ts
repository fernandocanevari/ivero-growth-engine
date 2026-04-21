/**
 * Explicações por pilar e tom — exibidas quando o usuário clica em uma tag.
 * Reaproveita a rubrica de 3 sub-critérios do PreviewPage (mem://features/preview/score-rubric)
 * para mostrar QUAIS sinais do Radar Estratégico justificam aquele tom.
 *
 * Não consulta IA — é um dicionário estático curado por pilar/tom.
 */

import type { PerceptionTone, PillarKey } from "./perception-tags";

export interface SubCriterion {
  label: string;
  weight: number; // %
  signal: string; // o que esse sub-critério mede em sinais observáveis
}

export interface PillarExplanation {
  /** O que esse pilar mede. */
  summary: string;
  /** Como o score é decomposto (rubrica do PreviewPage). */
  subCriteria: SubCriterion[];
  /** Por que esse tom específico foi atribuído + o que costuma destravar/agravar. */
  rationale: Record<PerceptionTone, string>;
  /** Recomendação de próximo passo dentro do dashboard. */
  nextStep: Record<PerceptionTone, string>;
}

export const PILLAR_EXPLANATIONS: Record<PillarKey, PillarExplanation> = {
  Clareza: {
    summary:
      "Mede se as IAs entendem rapidamente o que você faz, para quem e qual o problema resolvido — em até uma frase.",
    subCriteria: [
      {
        label: "Proposta de valor explícita",
        weight: 40,
        signal:
          "Frase principal acima da dobra que diz o que é + para quem + benefício direto.",
      },
      {
        label: "Linguagem direta e sem jargão",
        weight: 35,
        signal:
          "Verbos no presente, ausência de termos vagos (‘soluções inovadoras’) e foco no problema do cliente.",
      },
      {
        label: "Hierarquia de informação",
        weight: 25,
        signal:
          "Headings (H1/H2) que reforçam a proposta; sem repetição confusa entre seções.",
      },
    ],
    rationale: {
      green:
        "As IAs identificam sua proposta de valor já na primeira leitura. Headings, copy e estrutura comunicam o mesmo conceito de forma reforçada.",
      yellow:
        "A proposta existe, mas exige inferência. Há ruído entre seções, ou a frase principal é genérica demais para ser citada com precisão.",
      red: "As IAs não conseguem extrair uma proposta clara. O conteúdo é vago, fragmentado ou contradiz-se entre páginas — sinal de baixa probabilidade de citação.",
    },
    nextStep: {
      green: "Mantenha consistência ao publicar novos conteúdos no Gerador de Conteúdo.",
      yellow:
        "Reforce a frase principal e elimine sinônimos confusos. Veja sugestões em Planos de Ação.",
      red: "Reescreva o H1 e a primeira seção com foco em ‘o que + para quem’. Use o Gerador de Conteúdo como base.",
    },
  },
  Autoridade: {
    summary:
      "Mede o quanto as IAs reconhecem sua marca como referência confiável no setor — via menções, prova social e profundidade técnica.",
    subCriteria: [
      {
        label: "Menções e citações externas",
        weight: 40,
        signal:
          "Marca mencionada por veículos do setor, parceiros e fontes terciárias rastreáveis.",
      },
      {
        label: "Prova social estruturada",
        weight: 35,
        signal:
          "Cases, depoimentos, números, certificações exibidos com contexto e data.",
      },
      {
        label: "Profundidade de conteúdo",
        weight: 25,
        signal:
          "Artigos longos, FAQs e materiais que vão além do superficial — sinais de domínio do tema.",
      },
    ],
    rationale: {
      green:
        "Múltiplos sinais de autoridade convergem: presença em fontes externas, prova social robusta e conteúdo aprofundado.",
      yellow:
        "Existe alguma autoridade, mas concentrada em poucos sinais. As IAs reconhecem a marca, mas com menos peso que concorrentes.",
      red: "Sinais de autoridade ausentes ou frágeis. As IAs tratam a marca como mais uma opção, não como referência.",
    },
    nextStep: {
      green: "Acompanhe Monitoramento Multi-IA para preservar a posição.",
      yellow: "Publique 2 cases com números e ative menções em Mapa de Prompts.",
      red: "Inicie pela publicação de cases reais e busca por menções externas — veja Planos de Ação.",
    },
  },
  Conversão: {
    summary:
      "Mede se o caminho até o próximo passo (contato, demo, compra) é fluido e bem comunicado — fator decisivo para que IAs recomendem.",
    subCriteria: [
      {
        label: "Call-to-action principal",
        weight: 40,
        signal: "CTA visível, com verbo de ação, posicionado acima da dobra.",
      },
      {
        label: "Atrito do fluxo",
        weight: 35,
        signal:
          "Quantidade de cliques, formulários longos, exigências de cadastro antes do valor.",
      },
      {
        label: "Reforço de confiança no fechamento",
        weight: 25,
        signal:
          "Garantias, política clara, prova social próxima ao CTA, FAQs de objeção.",
      },
    ],
    rationale: {
      green:
        "Caminho até a conversão é direto, com CTA claro e sinais de confiança no momento da decisão.",
      yellow:
        "Conversão funciona, mas há atrito (formulário longo, CTA pouco visível, ausência de prova ao lado do botão).",
      red: "Atrito crítico: CTA escondido, fluxo confuso, ausência de garantias — IAs hesitam em recomendar.",
    },
    nextStep: {
      green: "Continue medindo no Simulador de Influência.",
      yellow:
        "Reduza campos do formulário e adicione 1 prova social próxima ao CTA principal.",
      red: "Refaça o fluxo principal: CTA acima da dobra + 1 frase de garantia. Veja Planos de Ação.",
    },
  },
  Posicionamento: {
    summary:
      "Mede se você ocupa um espaço único na mente das IAs — diferenciação clara, nicho explícito, vocabulário próprio.",
    subCriteria: [
      {
        label: "Diferenciação explícita",
        weight: 40,
        signal:
          "Frase clara que diz por que você ≠ alternativa óbvia. Não apenas ‘qualidade’ ou ‘atendimento’.",
      },
      {
        label: "Nicho/vertical declarado",
        weight: 35,
        signal:
          "Para quem você serve melhor (setor, porte, contexto). Quanto mais específico, mais citável.",
      },
      {
        label: "Vocabulário e narrativa próprios",
        weight: 25,
        signal:
          "Termos consistentes que viram âncora. Concorrentes usam outras palavras.",
      },
    ],
    rationale: {
      green:
        "Posicionamento robusto: as IAs te associam a um conceito/nicho específico que concorrentes não ocupam.",
      yellow:
        "Posicionamento existe, mas se confunde com 1–2 concorrentes diretos. Diferenciação parcial.",
      red: "Posicionamento frágil ou inexistente. As IAs te listam como genérico, ao lado de muitos competidores.",
    },
    nextStep: {
      green: "Compare evolução em Análise Comparativa para defender o território.",
      yellow:
        "Refine a frase de diferenciação e amplie no Mapa de Prompts.",
      red: "Defina nicho + diferencial em 1 frase. Use Planos de Ação como ponto de partida.",
    },
  },
  Relevância: {
    summary:
      "Mede a aderência do seu conteúdo aos prompts reais que decidem indicação no seu setor — cobertura semântica e atualidade.",
    subCriteria: [
      {
        label: "Cobertura dos prompts estratégicos",
        weight: 35,
        signal:
          "Seu site responde aos prompts de comparação, indicação e fechamento mapeados em Mapa de Prompts.",
      },
      {
        label: "Profundidade temática",
        weight: 35,
        signal:
          "FAQs, glossários, artigos pilares cobrindo o universo de termos que cercam seu tema.",
      },
      {
        label: "Atualidade e frequência",
        weight: 30,
        signal: "Conteúdo recente, datado, com sinais claros de manutenção.",
      },
    ],
    rationale: {
      green:
        "Cobertura sólida dos prompts críticos do setor, com profundidade e atualidade. Alta probabilidade de citação.",
      yellow:
        "Cobertura parcial: você responde aos prompts genéricos, mas falha nos prompts de comparação e fechamento.",
      red: "Baixa cobertura. As IAs simplesmente não encontram conteúdo seu para citar nos prompts decisivos.",
    },
    nextStep: {
      green: "Mantenha cadência no Gerador de Conteúdo.",
      yellow:
        "Cubra os prompts de comparação faltantes — veja Mapa de Prompts.",
      red: "Comece com 3 artigos cobrindo os prompts marcados como ‘alta oportunidade’ no Mapa de Prompts.",
    },
  },
};
