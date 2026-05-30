import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ModelConfig {
  name: string;
  url: string;
  model: string;
  getHeaders: () => Record<string, string>;
  parseResponse: (data: any) => string;
}

function getModelConfigs(): ModelConfig[] {
  const openaiKey = Deno.env.get("key_Open_IA");
  const geminiKey = Deno.env.get("Key_gemini");
  const claudeKey = Deno.env.get("Key_antropic_claude");

  const configs: ModelConfig[] = [];

  if (openaiKey) {
    configs.push({
      name: "ChatGPT",
      url: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
      getHeaders: () => ({
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      }),
      parseResponse: (data) => data.choices?.[0]?.message?.content || "",
    });
  }

  if (geminiKey) {
    // "Gemini" = modelo puro (2.5-flash-lite), sem grounding — baseline da memória do modelo.
    // "Google Modo IA" = 2.5-flash-lite + Google Search grounding em tempo real (rápido/barato).
    const geminiParse = (data: any) => {
      const parts = data.candidates?.[0]?.content?.parts || [];
      return parts.map((p: any) => p?.text || "").join("").trim();
    };

    configs.push({
      name: "Gemini",
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
      model: "gemini-2.5-flash-lite",
      getHeaders: () => ({ "Content-Type": "application/json" }),
      parseResponse: geminiParse,
    });

    configs.push({
      name: "Google Modo IA",
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
      model: "gemini-2.5-flash-lite",
      getHeaders: () => ({ "Content-Type": "application/json" }),
      parseResponse: geminiParse,
    });
  }

  // MVP: ChatGPT, Gemini, Google Modo IA.
  // Claude, Perplexity, GPT-5, Copilot e OpenAI Azure ficam no roadmap.
  // (Claude desativado temporariamente — chave Key_antropic_claude sem créditos.)
  void claudeKey;

  return configs;
}


function getErrorMessage(status: number): string {
  if (status === 429) return "Limite atingido";
  if (status === 400) return "Sem créditos";
  if (status === 401 || status === 403) return "Chave inválida";
  return `Erro HTTP ${status}`;
}

const DIAGNOSTICO_SYSTEM_PROMPT = `SISTEMA — RADAR ESTRATÉGICO IVERO

Pergunta-guia: "Esse site tem sinais suficientes para ser recomendado por uma IA?"

Você receberá o conteúdo (ou referência) de um site/marca. Avalie os 5 pilares abaixo. Para CADA pilar, avalie 3 sub-critérios objetivos (cada um com score 0–100 e justificativa em até 1 frase) e depois calcule o score final do pilar como MÉDIA PONDERADA dos 3 critérios usando exatamente os pesos indicados.

Retorne APENAS um JSON válido (sem markdown, sem texto antes ou depois).

--- CLAREZA (Entendimento) ---
Critérios (com pesos):
1. "Proposta de valor no hero" (peso 40) — A proposta de valor está explícita e visível no topo?
2. "Compreensão em <5s" (peso 35) — Um visitante entende em menos de 5 segundos o que a marca faz e para quem?
3. "Linguagem livre de jargão" (peso 25) — A linguagem é livre de jargão e ruído?

--- AUTORIDADE (Credibilidade) ---
Critérios (com pesos):
1. "Provas sociais (cases, números, depoimentos)" (peso 40) — Há provas sociais concretas?
2. "Expertise técnica/conteúdo especializado" (peso 35) — A marca demonstra expertise com conteúdo técnico ou especializado?
3. "Prêmios, certificações e reconhecimentos" (peso 25) — Existem menções a prêmios, certificações ou reconhecimentos externos?

--- POSICIONAMENTO (Identidade) ---
Critérios (com pesos):
1. "Nicho e público-alvo definidos" (peso 40) — O nicho e o público-alvo estão claramente definidos?
2. "Diferencial competitivo declarado" (peso 35) — A marca declara seu diferencial em relação a concorrentes?
3. "Consistência de mensagem" (peso 25) — A mensagem é consistente ao longo de toda a página?

--- CONVERSÃO (Ação) ---
Critérios (com pesos):
1. "CTAs claros e visíveis" (peso 40) — Existem CTAs claros e visíveis que induzem o visitante a agir?
2. "Oferta ou próximo passo definido" (peso 35) — Há uma oferta ou próximo passo bem definido?
3. "Fluxo de navegação lógico" (peso 25) — O fluxo de navegação conduz naturalmente a uma ação?

--- RELEVÂNCIA (Contexto e busca) ---
Critérios (com pesos):
1. "Termos e palavras-chave do nicho" (peso 35) — O conteúdo utiliza termos e contextos relevantes do nicho da marca?
2. "Responde perguntas reais do público" (peso 35) — O site responde perguntas que o público-alvo faria a uma IA?
3. "Cobertura semântica do setor" (peso 30) — Há cobertura semântica suficiente para que sistemas de IA associem a marca ao setor correto?

Para cada pilar, "score" final DEVE ser calculado como: round((c1*p1 + c2*p2 + c3*p3) / 100), onde cN é o score do critério e pN seu peso.

Cada "justificativa" (do pilar e dos critérios) deve estar em português e ter no máximo 2 frases (critérios: 1 frase).

Formato de resposta OBRIGATÓRIO (apenas JSON puro, exatamente esta estrutura):
{
  "clareza": {
    "score": 0,
    "justificativa": "",
    "criterios": [
      { "nome": "Proposta de valor no hero", "score": 0, "peso": 40, "justificativa": "" },
      { "nome": "Compreensão em <5s", "score": 0, "peso": 35, "justificativa": "" },
      { "nome": "Linguagem livre de jargão", "score": 0, "peso": 25, "justificativa": "" }
    ]
  },
  "autoridade": {
    "score": 0,
    "justificativa": "",
    "criterios": [
      { "nome": "Provas sociais (cases, números, depoimentos)", "score": 0, "peso": 40, "justificativa": "" },
      { "nome": "Expertise técnica/conteúdo especializado", "score": 0, "peso": 35, "justificativa": "" },
      { "nome": "Prêmios, certificações e reconhecimentos", "score": 0, "peso": 25, "justificativa": "" }
    ]
  },
  "posicionamento": {
    "score": 0,
    "justificativa": "",
    "criterios": [
      { "nome": "Nicho e público-alvo definidos", "score": 0, "peso": 40, "justificativa": "" },
      { "nome": "Diferencial competitivo declarado", "score": 0, "peso": 35, "justificativa": "" },
      { "nome": "Consistência de mensagem", "score": 0, "peso": 25, "justificativa": "" }
    ]
  },
  "conversao": {
    "score": 0,
    "justificativa": "",
    "criterios": [
      { "nome": "CTAs claros e visíveis", "score": 0, "peso": 40, "justificativa": "" },
      { "nome": "Oferta ou próximo passo definido", "score": 0, "peso": 35, "justificativa": "" },
      { "nome": "Fluxo de navegação lógico", "score": 0, "peso": 25, "justificativa": "" }
    ]
  },
  "relevancia": {
    "score": 0,
    "justificativa": "",
    "criterios": [
      { "nome": "Termos e palavras-chave do nicho", "score": 0, "peso": 35, "justificativa": "" },
      { "nome": "Responde perguntas reais do público", "score": 0, "peso": 35, "justificativa": "" },
      { "nome": "Cobertura semântica do setor", "score": 0, "peso": 30, "justificativa": "" }
    ]
  }
}`;

function extractJsonFromContent(content: string): any | null {
  if (!content) return null;
  // Remove markdown code fences if present
  let cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find first { ... } block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function emptyPillar() {
  return { score: 0, justificativa: "", criterios: [] as Array<{ nome: string; score: number; peso: number; justificativa: string }> };
}

function emptyPillars() {
  return {
    clareza: emptyPillar(),
    autoridade: emptyPillar(),
    posicionamento: emptyPillar(),
    conversao: emptyPillar(),
    relevancia: emptyPillar(),
  };
}

async function callModel(
  config: ModelConfig,
  userPrompt: string,
  systemPrompt: string,
  brandName: string,
  mode: string
): Promise<any> {
  const isDiagnostico = mode === "diagnostico";
  const maxTokens = isDiagnostico ? 2500 : 300;

  try {
    let body: any;

    if (config.name === "Gemini" || config.name === "Google Modo IA") {
      // Só "Google Modo IA" (gemini-2.5-flash-lite) ativa Google Search grounding em tempo real.
      // "Gemini" (gemini-2.5-flash-lite) responde só a partir da memória do modelo, sem busca web.
      const useGrounding = config.name === "Google Modo IA";
      body = {
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nUser query: ${userPrompt}` }] },
        ],
        ...(useGrounding ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: { maxOutputTokens: maxTokens },
      };

    } else if (config.name === "ChatGPT") {
      // gpt-4o-mini não é reasoning model: resposta direta, sem tokens internos.
      body = {
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: isDiagnostico ? 2000 : 400,
      };

    } else if (config.name === "Claude") {
      // Anthropic Messages API: system separado, messages só user/assistant.
      body = {
        model: config.model,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: isDiagnostico ? 2000 : 400,
      };

    } else {
      body = {
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
      };
    }


    const response = await fetch(config.url, {
      method: "POST",
      headers: config.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`${config.name} error [${response.status}]:`, errText);
      const errorMessage = getErrorMessage(response.status);
      if (isDiagnostico) {
        return { model: config.name, error: true, errorMessage, pillars: emptyPillars() };
      }
      return {
        model: config.name,
        error: true,
        errorMessage,
        ...(mode === "simulator"
          ? { response: "", mentionsBrand: false }
          : { mentioned: false }),
      };
    }

    const data = await response.json();
    const content = config.parseResponse(data);


    // Citações de grounding (apenas "Google Modo IA" — único slot com google_search ativo).
    // Estrutura: candidates[0].groundingMetadata.groundingChunks[].web
    let citations: Array<{ title: string; uri: string }> = [];
    if (config.name === "Google Modo IA") {
      const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const seen = new Set<string>();
      for (const c of chunks) {
        const uri = c?.web?.uri;
        const title = c?.web?.title || uri;
        if (uri && !seen.has(uri)) {
          seen.add(uri);
          citations.push({ title: String(title).slice(0, 160), uri: String(uri) });
        }
      }
      citations = citations.slice(0, 8);
    }


    if (isDiagnostico) {
      const parsed = extractJsonFromContent(content);
      if (!parsed) {
        console.error(`${config.name} JSON parse failed. Content:`, content?.slice(0, 500));
        return {
          model: config.name,
          error: true,
          errorMessage: "Resposta inválida",
          pillars: emptyPillars(),
        };
      }
      // Normalize keys & ensure shape (with criterios)
      const clamp = (n: any) =>
        typeof n === "number" && isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
      const normalizeCriterios = (arr: any): Array<{ nome: string; score: number; peso: number; justificativa: string }> => {
        if (!Array.isArray(arr)) return [];
        return arr.slice(0, 3).map((c: any) => ({
          nome: typeof c?.nome === "string" ? c.nome : "",
          score: clamp(c?.score),
          peso: typeof c?.peso === "number" && isFinite(c.peso) ? Math.max(0, Math.min(100, Math.round(c.peso))) : 0,
          justificativa: typeof c?.justificativa === "string" ? c.justificativa : "",
        }));
      };
      const normalize = (k: string) => {
        const v = parsed[k];
        if (v && typeof v === "object") {
          const criterios = normalizeCriterios(v.criterios);
          // If model didn't compute the weighted score, derive it from criterios
          let score = clamp(v.score);
          if (!score && criterios.length === 3) {
            const totalPeso = criterios.reduce((s, c) => s + c.peso, 0) || 100;
            score = Math.round(
              criterios.reduce((s, c) => s + c.score * c.peso, 0) / totalPeso
            );
          }
          return {
            score,
            justificativa: typeof v.justificativa === "string" ? v.justificativa : "",
            criterios,
          };
        }
        return emptyPillar();
      };
      return {
        model: config.name,
        pillars: {
          clareza: normalize("clareza"),
          autoridade: normalize("autoridade"),
          posicionamento: normalize("posicionamento"),
          conversao: normalize("conversao"),
          relevancia: normalize("relevancia"),
        },
      };
    }

    const mentionsBrand = content.toLowerCase().includes(brandName.toLowerCase());
    if (mode === "simulator") {
      return { model: config.name, response: content, mentionsBrand, citations };
    } else {
      return { model: config.name, mentioned: mentionsBrand, citations };
    }
  } catch (e) {
    console.error(`${config.name} call failed:`, e);
    if (isDiagnostico) {
      return { model: config.name, error: true, errorMessage: "Falha na conexão", pillars: emptyPillars() };
    }
    return {
      model: config.name,
      error: true,
      errorMessage: "Falha na conexão",
      ...(mode === "simulator"
        ? { response: "", mentionsBrand: false }
        : { mentioned: false }),
    };
  }
}

/**
 * Extrai uma "nuvem de percepção" das respostas dos 5 modelos.
 * Concatena todos os textos e usa Lovable AI Gateway via tool calling para
 * gerar até 30 termos/expressões com frequência, sentimento e nº de modelos.
 *
 * Retorna [] em qualquer falha — nunca quebra o diagnóstico principal.
 */
async function extractKeywordCloud(
  modelResults: any[],
  brandName: string,
): Promise<Array<{
  term: string;
  frequency: number;
  sentiment: "positive" | "neutral" | "negative";
  mentioned_in_models: number;
  examples?: Array<{ quote: string; model: string }>;
  models?: Array<{ model: string; count: number }>;
}>> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) return [];

  // Coleta texto de cada modelo (pula erros). Usa justificativas dos pilares
  // como corpus, já que o modo diagnóstico retorna estrutura JSON, não prosa.
  const perModelTexts: { model: string; text: string }[] = [];
  for (const r of modelResults) {
    if (r?.error || !r?.pillars) continue;
    const parts: string[] = [];
    for (const k of ["clareza", "autoridade", "posicionamento", "conversao", "relevancia"]) {
      const p = r.pillars[k];
      if (p?.justificativa) parts.push(p.justificativa);
      if (Array.isArray(p?.criterios)) {
        for (const c of p.criterios) if (c?.justificativa) parts.push(c.justificativa);
      }
    }
    const text = parts.join(" ").trim();
    if (text) perModelTexts.push({ model: r.model, text });
  }

  if (perModelTexts.length === 0) return [];

  const corpus = perModelTexts
    .map((m) => `[${m.model}]\n${m.text}`)
    .join("\n\n---\n\n");

  const systemPrompt = `Você é um analista de percepção de marca. Receberá respostas de múltiplos modelos de IA descrevendo a marca "${brandName}" e seu site, cada bloco prefixado com [NomeDoModelo].

Sua tarefa: extrair até 30 termos ou expressões (1 a 4 palavras) que melhor representem COMO essas IAs falam da marca — atributos, qualidades, problemas, vocabulário do nicho.

Para cada termo extraia também:
- "examples": de 1 a 3 frases curtas (≤180 caracteres) ONDE o termo (ou variação clara) aparece, copiadas literalmente do corpus, junto com o nome do modelo de origem (use exatamente o nome entre colchetes que precede o trecho).
- "models": lista dos modelos em que o termo apareceu, com a contagem aproximada de menções em cada um. Inclua apenas modelos onde o termo (ou variação) realmente aparece.

Regras:
- Prefira frases-conceito significativas ("ingredientes frescos", "rápido cozimento") a palavras isoladas vagas.
- Ignore termos genéricos sem valor descritivo ("site", "marca", "empresa", "produto", "serviço").
- Idioma: português do Brasil, lowercase (exceto siglas).
- "frequency": soma das menções no corpus inteiro.
- "mentioned_in_models": em quantos dos ${perModelTexts.length} modelos o termo aparece.
- "sentiment": "positive" para qualidades/elogios, "negative" para falhas/críticas, "neutral" para descritivos factuais.
- Os exemplos devem ser frases REAIS do corpus, nunca inventadas.
- Ordene do mais relevante para o menos relevante.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: corpus },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_keywords",
              description: "Retorna a nuvem de percepção extraída do corpus, com exemplos por modelo.",
              parameters: {
                type: "object",
                properties: {
                  keywords: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        term: { type: "string" },
                        frequency: { type: "number" },
                        sentiment: {
                          type: "string",
                          enum: ["positive", "neutral", "negative"],
                        },
                        mentioned_in_models: { type: "number" },
                        examples: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              quote: { type: "string" },
                              model: { type: "string" },
                            },
                            required: ["quote", "model"],
                            additionalProperties: false,
                          },
                        },
                        models: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              model: { type: "string" },
                              count: { type: "number" },
                            },
                            required: ["model", "count"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: [
                        "term",
                        "frequency",
                        "sentiment",
                        "mentioned_in_models",
                        "examples",
                        "models",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["keywords"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_keywords" } },
      }),
    });

    if (!response.ok) {
      console.error("extract_keywords HTTP error:", response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      console.warn("extract_keywords: no tool_call arguments returned");
      return [];
    }
    const parsed = JSON.parse(argsStr);
    const keywords = Array.isArray(parsed?.keywords) ? parsed.keywords : [];

    const totalModels = perModelTexts.length;
    const validModelNames = new Set(perModelTexts.map((m) => m.model));

    return keywords
      .map((k: any) => {
        const examples = Array.isArray(k.examples)
          ? k.examples
              .map((e: any) => ({
                quote: typeof e?.quote === "string" ? e.quote.trim().slice(0, 220) : "",
                model: typeof e?.model === "string" ? e.model.trim() : "",
              }))
              .filter((e: any) => e.quote && validModelNames.has(e.model))
              .slice(0, 5)
          : [];
        const models = Array.isArray(k.models)
          ? k.models
              .map((m: any) => ({
                model: typeof m?.model === "string" ? m.model.trim() : "",
                count: Math.max(1, Math.round(Number(m?.count) || 1)),
              }))
              .filter((m: any) => m.model && validModelNames.has(m.model))
              .sort((a: any, b: any) => b.count - a.count)
          : [];
        return {
          term: typeof k.term === "string" ? k.term.trim() : "",
          frequency: Math.max(1, Math.round(Number(k.frequency) || 1)),
          sentiment:
            k.sentiment === "positive" || k.sentiment === "negative" ? k.sentiment : "neutral",
          mentioned_in_models: Math.max(
            1,
            Math.min(totalModels, Math.round(Number(k.mentioned_in_models) || 1)),
          ),
          examples,
          models,
        };
      })
      .filter((k: any) => k.term && k.term.length <= 60)
      .slice(0, 30);
  } catch (e) {
    console.error("extract_keywords failed:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, brandName, mode, geoContext: rawGeo, extractCloud } = await req.json();

    if (!prompt || !brandName) {
      return new Response(JSON.stringify({ error: "prompt and brandName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const configs = getModelConfigs();
    if (configs.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma chave de IA configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Contexto geográfico opcional: injetado para calibrar análise/resposta
    // ao recorte regional declarado pela marca em brand_settings.
    const geoContext = typeof rawGeo === "string" ? rawGeo.trim().slice(0, 300) : "";
    const geoBlock = geoContext
      ? `\n\nContexto da marca: ${geoContext} Avalie/responda considerando esse recorte de atuação — relevância, exemplos e cobertura semântica devem ser ponderados para esse público.`
      : "";

    const systemPrompt =
      mode === "diagnostico"
        ? `${DIAGNOSTICO_SYSTEM_PROMPT}\n\nMarca a ser avaliada: "${brandName}".${geoBlock}`
        : `You are an AI assistant. Answer the user's question naturally in Portuguese (Brazil). If the brand "${brandName}" is relevant to the answer, mention it naturally. If not, don't force it. Keep it to 1-3 sentences.${geoBlock}`;

    const results = await Promise.all(
      configs.map((config) => callModel(config, prompt, systemPrompt, brandName, mode))
    );

    // Detecta falha total: todos os modelos retornaram erro (cota/crédito/conexão).
    const failedResults = results.filter((r: any) => r?.error === true);
    const allModelsFailed = results.length > 0 && failedResults.length === results.length;
    const errorSummary = failedResults.map((r: any) => ({
      model: r.model,
      errorMessage: r.errorMessage || "Erro desconhecido",
    }));

    // Nuvem de percepção: extraída apenas no modo Diagnóstico (PreviewPage)
    // e apenas quando há ao menos um modelo válido (evita chamada inútil ao gateway).
    let keyword_cloud: any[] = [];
    if (mode === "diagnostico" && !allModelsFailed && extractCloud === true) {
      keyword_cloud = await extractKeywordCloud(results, brandName);
    }

    return new Response(
      JSON.stringify({ results, keyword_cloud, allModelsFailed, errorSummary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("simulate-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
