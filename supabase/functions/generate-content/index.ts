import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRIAL_GENERATION_LIMIT = 2;

const SYSTEM_PROMPT = `Você é um estrategista de GEO (Generative Engine Optimization) escrevendo em português do Brasil.
Produz conteúdo desenhado para ser CITADO por IAs (ChatGPT, Gemini, Perplexity, Claude).

Regras inegociáveis:
- Estrutura H2/H3 escaneável com perguntas explícitas que IAs costumam citar.
- Cada seção começa com uma definição direta no primeiro parágrafo.
- Sempre que possível: dados, números, comparativos concretos.
- FAQ em pares pergunta-resposta autocontidos (cada resposta < 80 palavras).
- Sem hype, sem "nós oferecemos", sem CTAs comerciais.
- Tom executivo e factual, evite primeira pessoa promocional.
- Considere o diagnóstico da marca para fechar lacunas específicas dos pilares fracos.

Você SEMPRE responde chamando a função save_generated_content com a estrutura completa.`;

interface ContextPayload {
  weakPillars?: { name: string; score: number }[];
  strongPillars?: { name: string; score: number }[];
  mainCompetitor?: string;
  sector?: string;
  brandName?: string;
  uncoveredPrompts?: string[];
}

function buildUserPrompt(opts: {
  topic: string;
  tone: string;
  formats: string[];
  context: ContextPayload;
}) {
  const { topic, tone, formats, context } = opts;
  const ctxLines: string[] = [];
  if (context.brandName) ctxLines.push(`- Marca: ${context.brandName}`);
  if (context.sector) ctxLines.push(`- Setor: ${context.sector}`);
  if (context.mainCompetitor)
    ctxLines.push(`- Concorrente principal: ${context.mainCompetitor}`);
  if (context.weakPillars?.length)
    ctxLines.push(
      `- Pilares fracos a fortalecer: ${context.weakPillars
        .map((p) => `${p.name} (${p.score})`)
        .join(", ")}`,
    );
  if (context.strongPillars?.length)
    ctxLines.push(
      `- Pilares fortes a manter: ${context.strongPillars
        .map((p) => `${p.name} (${p.score})`)
        .join(", ")}`,
    );
  if (context.uncoveredPrompts?.length)
    ctxLines.push(
      `- Prompts onde a marca não aparece: ${context.uncoveredPrompts.join("; ")}`,
    );

  return `Gere conteúdo estratégico GEO sobre o tema abaixo.

TEMA: ${topic}
TOM: ${tone}
FORMATOS SOLICITADOS: ${formats.join(", ")}

CONTEXTO DA MARCA (use para ajustar profundidade e referências):
${ctxLines.length ? ctxLines.join("\n") : "- (sem contexto adicional)"}

Entregáveis (chame save_generated_content):
- article_md: artigo completo entre 800-1200 palavras, em Markdown, com H2/H3, intro factual, 3-5 seções, e conclusão sintética sem CTA promocional.
- faq: 5-7 itens. Cada item { question, answer } com resposta < 80 palavras, autocontida.
- summary_md: resumo executivo de ~200 palavras em Markdown, focado em insights citáveis.

Não inclua o nome da marca como autopromoção; foque em definições, dados e clareza.`;
}

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "save_generated_content",
    description:
      "Persiste o conteúdo gerado (artigo, FAQ e resumo executivo) em formato estruturado.",
    parameters: {
      type: "object",
      properties: {
        article_md: {
          type: "string",
          description: "Artigo completo em Markdown (800-1200 palavras).",
        },
        faq: {
          type: "array",
          description: "Lista de 5-7 pares pergunta/resposta.",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              answer: { type: "string" },
            },
            required: ["question", "answer"],
            additionalProperties: false,
          },
        },
        summary_md: {
          type: "string",
          description: "Resumo executivo em Markdown (~200 palavras).",
        },
      },
      required: ["article_md", "faq", "summary_md"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autenticado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = userData.user.id;

    // Service-role client for cross-table reads + safe insert.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);

    // --- Body ---
    const body = await req.json().catch(() => null);
    if (!body || typeof body.topic !== "string" || body.topic.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Informe um tema válido (mínimo 3 caracteres)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const topic: string = body.topic.trim().slice(0, 500);
    const tone: string =
      typeof body.tone === "string" && body.tone.length <= 50 ? body.tone : "executivo";
    const formatsRaw = Array.isArray(body.formats) ? body.formats : ["article", "faq", "summary"];
    const formats = formatsRaw
      .filter((f: any): f is string => typeof f === "string")
      .filter((f: string) => ["article", "faq", "summary"].includes(f));
    if (formats.length === 0) formats.push("article", "faq", "summary");
    const contextSelected: ContextPayload =
      body.context && typeof body.context === "object" ? body.context : {};

    // --- Trial quota check ---
    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roleRows ?? []).some((r: any) => r.role === "admin");

    if (!isAdmin) {
      const { count, error: countErr } = await adminClient
        .from("generated_content")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (countErr) {
        console.error("quota count error", countErr);
      } else if ((count ?? 0) >= TRIAL_GENERATION_LIMIT) {
        return new Response(
          JSON.stringify({
            error: "trial_quota_exceeded",
            message: `Limite do trial atingido (${TRIAL_GENERATION_LIMIT} gerações).`,
            used: count,
            limit: TRIAL_GENERATION_LIMIT,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // --- Enrich context with brand_settings + last analysis (server-side, trustable) ---
    const [{ data: brand }, { data: lastAnalysis }] = await Promise.all([
      adminClient
        .from("brand_settings")
        .select("brand_name, sector, main_competitor")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle(),
      adminClient
        .from("analysis_history")
        .select(
          "clarity_score, authority_score, positioning_score, conversion_score, experience_score",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const enrichedContext: ContextPayload = { ...contextSelected };
    if (!enrichedContext.brandName && brand?.brand_name) enrichedContext.brandName = brand.brand_name;
    if (!enrichedContext.sector && brand?.sector) enrichedContext.sector = brand.sector;
    if (!enrichedContext.mainCompetitor && brand?.main_competitor)
      enrichedContext.mainCompetitor = brand.main_competitor;

    if (!enrichedContext.weakPillars && lastAnalysis) {
      const pillars = [
        { name: "Clareza", score: lastAnalysis.clarity_score ?? 0 },
        { name: "Autoridade", score: lastAnalysis.authority_score ?? 0 },
        { name: "Posicionamento", score: lastAnalysis.positioning_score ?? 0 },
        { name: "Conversão", score: lastAnalysis.conversion_score ?? 0 },
        { name: "Relevância", score: lastAnalysis.experience_score ?? 0 },
      ];
      enrichedContext.weakPillars = pillars.filter((p) => p.score < 60);
      enrichedContext.strongPillars = pillars.filter((p) => p.score >= 75);
    }

    // --- Call Lovable AI Gateway with tool calling ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const model = (typeof body.model === "string" && body.model) || "google/gemini-3-flash-preview";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt({ topic, tone, formats, context: enrichedContext }) },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "save_generated_content" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de uso atingido. Aguarde alguns minutos e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos do gateway de IA esgotados. Avise o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(
        JSON.stringify({ error: "Falha ao gerar conteúdo. Tente novamente em instantes." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("Missing tool_call in AI response", JSON.stringify(aiData).slice(0, 800));
      return new Response(
        JSON.stringify({ error: "Resposta da IA fora do formato esperado. Tente novamente." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: { article_md?: string; faq?: any[]; summary_md?: string };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("JSON parse failed", e);
      return new Response(
        JSON.stringify({ error: "Não conseguimos interpretar a resposta da IA. Tente novamente." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const article_md = typeof parsed.article_md === "string" ? parsed.article_md : "";
    const summary_md = typeof parsed.summary_md === "string" ? parsed.summary_md : "";
    const faq = Array.isArray(parsed.faq)
      ? parsed.faq
          .filter((q: any) => q && typeof q.question === "string" && typeof q.answer === "string")
          .map((q: any) => ({ question: q.question, answer: q.answer }))
      : [];

    // --- Persist ---
    const { data: inserted, error: insertErr } = await adminClient
      .from("generated_content")
      .insert({
        user_id: userId,
        topic,
        tone,
        formats,
        context_used: enrichedContext as any,
        article_md,
        faq_json: faq as any,
        summary_md,
        model_used: model,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("insert error", insertErr);
      return new Response(
        JSON.stringify({ error: "Conteúdo gerado mas falhou ao salvar. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ content: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content fatal:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
