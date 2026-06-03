// Ivero — Pipeline Haiku → Sonnet com prompt caching
// Haiku: extração de entidades + scoring por pilar
// Sonnet: relatório estratégico completo

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const SONNET_MODEL = "claude-sonnet-4-6";

const SYSTEM_BASE = `Você é o motor analítico da Ivero, uma plataforma B2B de auditoria de influência em IAs Generativas (GEO — Generative Engine Optimization).

A Ivero analisa o quanto uma marca é citada, recomendada e referenciada por LLMs (ChatGPT, Gemini, Perplexity, Claude, etc.) quando usuários buscam soluções no setor da marca.

Você avalia marcas em 5 PILARES de presença em IAs, cada um pontuado de 0 a 100:

1. AUTORIDADE — densidade de menções em fontes que LLMs treinam (Wikipedia, mídia, papers, fóruns técnicos, GitHub, sites de referência do setor). Marcas com baixa autoridade ficam invisíveis em IAs.

2. CLAREZA — quão objetivamente o site/conteúdo da marca explica o que ela faz, para quem, com que diferenciais. LLMs preferem conteúdo estruturado, com FAQs, definições claras e schema markup.

3. CONVERSÃO AI-FIRST — capacidade do conteúdo de ser usado como resposta direta por uma IA: existência de respostas curtas, listas, comparativos, dados verificáveis, llms.txt, citações de fontes.

4. POSICIONAMENTO — diferenciação semântica da marca. Como ela se distingue dos concorrentes na "mente" das IAs. Posicionamento difuso = a IA recomenda o concorrente.

5. FIO SEMÂNTICO (Narrative Coherence) — coerência entre os ativos da marca (site, blog, social, releases). Quanto mais consistente o vocabulário e a narrativa, mais forte o sinal para o LLM consolidar a entidade.

Saída sempre em JSON estrito, sem markdown, sem texto fora do JSON. Idioma: Português do Brasil.`;

interface HaikuOutput {
  authority_score: number;
  clarity_score: number;
  conversion_score: number;
  positioning_score: number;
  semantic_thread_score: number;
  overall_score: number;
  detected_entities: string[];
  content_gaps: string[];
  raw_brand_data: Record<string, unknown>;
}

async function callAnthropic(params: {
  apiKey: string;
  model: string;
  maxTokens: number;
  systemBase: string;
  userPrompt: string;
}) {
  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      // Prompt caching no system block — economia até 90% nos custos repetidos
      system: [
        {
          type: "text",
          text: params.systemBase,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: params.userPrompt }],
    }),
  });

  if (!resp.ok) {
    if (resp.status === 404) {
      throw new Error(`Modelo não encontrado: ${params.model}. Verifique se o model ID ainda é válido na API Anthropic.`);
    }
    const text = await resp.text();
    throw new Error(`Anthropic ${params.model} ${resp.status}: ${text.slice(0, 400)}`);
  }
  const data = await resp.json();
  const content = data?.content?.[0]?.text ?? "";
  return { content, usage: data?.usage ?? null };
}

function extractJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Resposta sem JSON válido");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

Deno.serve(async (req) => {
  console.log("ivero-analyze v2 started");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { brand_url, brand_name, brand_context } = await req.json();

    if (!brand_url || typeof brand_url !== "string") {
      return new Response(JSON.stringify({ error: "brand_url é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("Key_antropic_claude");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Key_antropic_claude não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ETAPA 0: FIRECRAWL — scrape do site real (silent fallback) =====
    let scrapedMarkdown = "";
    let scraped = false;
    const firecrawlDisabled = false; // DIAGNÓSTICO: reativado
    if (!firecrawlDisabled) {
      try {
        const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
        if (firecrawlKey) {
          let origin = "";
          try { origin = new URL(brand_url).origin; } catch { /* ignore */ }

          const routesToTry: string[] = [brand_url];
          if (origin) {
            routesToTry.push(`${origin}/about`, `${origin}/services`, `${origin}/blog`);
          }

          const scrapeOne = async (target: string): Promise<string> => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 20000);
              const resp = await fetch("https://api.firecrawl.dev/v2/scrape", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${firecrawlKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  url: target,
                  formats: ["markdown"],
                  onlyMainContent: true,
                }),
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              if (!resp || !resp.ok) return "";
              let data: any = null;
              try { data = await resp.json(); } catch { return ""; }
              if (!data) return "";
              const md: string = data?.data?.markdown ?? data?.markdown ?? "";
              const status: number | undefined = data?.data?.metadata?.statusCode ?? data?.metadata?.statusCode;
              if (status && status !== 200) return "";
              if (!md || typeof md !== "string" || md.trim().length < 100) return "";
              return `\n\n## Página: ${target}\n\n${md.trim()}`;
            } catch {
              return "";
            }
          };

          const results = await Promise.all(routesToTry.map(scrapeOne));
          let combined = (results || []).filter(Boolean).join("\n");

          if (combined && combined.trim().length > 0) {
            // Cap em 1000 palavras sem cortar mid-sentence
            const words = combined.split(/\s+/);
            if (words.length > 1000) {
              const capped = words.slice(0, 1000).join(" ");
              const lastStop = Math.max(
                capped.lastIndexOf("."),
                capped.lastIndexOf("!"),
                capped.lastIndexOf("?"),
                capped.lastIndexOf("\n"),
              );
              combined = lastStop > 0 ? capped.slice(0, lastStop + 1) : capped;
            }
            scrapedMarkdown = combined;
            scraped = true;
          }
        }
      } catch (firecrawlErr) {
        // Fallback silencioso — qualquer erro aqui não pode derrubar a função
        scrapedMarkdown = "";
        scraped = false;
        console.log("ivero-analyze firecrawl threw, falling back:", firecrawlErr instanceof Error ? firecrawlErr.message : String(firecrawlErr));
      }
    }
    console.log(`ivero-analyze firecrawl result: scraped=${scraped}, length=${scrapedMarkdown.length}`);

    // ===== ETAPA 1: HAIKU — extração + scoring =====
    const haikuPrompt = `Analise a presença em IAs da marca abaixo e retorne APENAS um JSON estrito (sem markdown).

${scraped ? `<scraped_content>
A seguir está o CONTEÚDO REAL extraído do site da marca via scraping (Firecrawl). Use este conteúdo como FONTE PRIMÁRIA da análise — copy real, headings, FAQs existentes, CTAs, estrutura semântica. Não infira a partir do nome/URL quando houver evidência aqui.
${scrapedMarkdown}
</scraped_content>

` : ""}URL: ${brand_url}
${brand_name ? `Nome: ${brand_name}` : ""}
${brand_context ? `Contexto adicional: ${brand_context}` : ""}

${scraped
  ? "Avalie os 5 pilares (0–100) com base PRINCIPALMENTE no conteúdo real scraped acima (clareza do copy, presença de FAQs/schema implícito, CTAs AI-friendly, diferenciação semântica, coerência narrativa entre páginas). Complemente com sinais públicos prováveis. Seja realista e calibrado."
  : "Avalie os 5 pilares (0–100) com base em sinais públicos prováveis (densidade de menções em fontes que LLMs treinam, clareza do posicionamento aparente pela URL/nome, presença esperada em comparativos, etc.). Seja realista e calibrado: a maioria das marcas brasileiras de médio porte fica entre 25 e 55."
}

Retorne EXATAMENTE este schema:
{
  "authority_score": number 0-100,
  "clarity_score": number 0-100,
  "conversion_score": number 0-100,
  "positioning_score": number 0-100,
  "semantic_thread_score": number 0-100,
  "overall_score": number 0-100 (média ponderada coerente),
  "detected_entities": string[] (3-8 entidades chave: produto, categoria, público, concorrentes prováveis),
  "content_gaps": string[] (3-6 lacunas concretas de conteúdo que prejudicam menções em IAs),
  "raw_brand_data": { "sector": string, "likely_audience": string, "likely_competitors": string[] }
}`;

    let haikuResp: Awaited<ReturnType<typeof callAnthropic>> = { content: "", usage: null };
    let haikuJson: HaikuOutput;
    try {
      haikuResp = await callAnthropic({
        apiKey,
        model: HAIKU_MODEL,
        maxTokens: 1500,
        systemBase: SYSTEM_BASE,
        userPrompt: haikuPrompt,
      });

      haikuJson = extractJson<HaikuOutput>(haikuResp.content);
    } catch {
      console.log("ivero-analyze haiku raw response:", haikuResp.content.slice(0, 500));
      throw new Error("Haiku parse failed — see logs for raw response.");
    }

    // ===== ETAPA 2: SONNET — relatório estratégico =====
    const sonnetPrompt = `Com base na análise estruturada abaixo, gere o RELATÓRIO ESTRATÉGICO completo da marca.

URL: ${brand_url}
${brand_name ? `Nome: ${brand_name}` : ""}

DADOS DA AUDITORIA (Haiku):
${JSON.stringify(haikuJson, null, 2)}

Retorne APENAS este JSON estrito (sem markdown, sem texto fora):
{
  "executive_summary": string (2-3 parágrafos, tom executivo, em PT-BR),
  "pillar_analysis": {
    "authority":       { "score": number, "insight": string, "recommendation": string },
    "clarity":         { "score": number, "insight": string, "recommendation": string },
    "conversion":      { "score": number, "insight": string, "recommendation": string },
    "positioning":     { "score": number, "insight": string, "recommendation": string },
    "semantic_thread": { "score": number, "insight": string, "recommendation": string }
  },
  "top_priorities": string[] (3-5 prioridades acionáveis em ordem de impacto),
  "roadmap": [
    { "phase": "0-30 dias",   "actions": string[] },
    { "phase": "30-90 dias",  "actions": string[] },
    { "phase": "90-180 dias", "actions": string[] }
  ]
}

Use os scores do Haiku no pillar_analysis. Insights devem citar evidências concretas. Recomendações devem ser acionáveis (não genéricas).`;

    let sonnetResp: Awaited<ReturnType<typeof callAnthropic>> = { content: "", usage: null };
    let sonnetJson: Record<string, unknown>;
    try {
      sonnetResp = await callAnthropic({
        apiKey,
        model: SONNET_MODEL,
        maxTokens: 4000,
        systemBase: "You are a strategic GEO analyst. Generate the report based on the audit data provided. Output strict JSON only, no markdown, in Brazilian Portuguese.",
        userPrompt: sonnetPrompt,
      });

      sonnetJson = extractJson<Record<string, unknown>>(sonnetResp.content);
    } catch {
      console.log("ivero-analyze sonnet raw response:", sonnetResp.content.slice(0, 500));
      throw new Error("Sonnet parse failed — see logs for raw response.");
    }

    return new Response(
      JSON.stringify({
        haiku: haikuJson,
        sonnet: sonnetJson,
        scraped,
        usage: { haiku: haikuResp.usage, sonnet: sonnetResp.usage },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("ivero-analyze error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
