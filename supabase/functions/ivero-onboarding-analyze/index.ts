// Ivero — Onboarding analyzer
// Recebe URL do site, raspa com Firecrawl, e usa Claude Sonnet para sugerir
// nome da empresa, descrição curta, segmento e concorrentes prováveis.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const SONNET_MODEL = "claude-sonnet-4-6";

interface OnboardingResult {
  brand_name: string;
  description: string;
  sector: string;
  competitors: string[];
}

function extractJson<T>(raw: string): T {
  let cleaned = raw.trim()
    .replace(/^\s*```(?:json)?\s*\n?/i, "")
    .replace(/\n?\s*```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Resposta sem JSON válido");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

type ScrapeOutcome =
  | { status: "ok"; markdown: string }
  | { status: "inaccessible" }
  | { status: "insufficient" };

async function firecrawlScrape(url: string, apiKey: string): Promise<ScrapeOutcome> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const resp = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!resp.ok) return { status: "inaccessible" };
    const data = await resp.json().catch(() => null);
    const md: string = data?.data?.markdown ?? data?.markdown ?? "";
    const useful = (md || "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (!useful) return { status: "inaccessible" };
    if (useful.length < 200) return { status: "insufficient" };
    const words = md.split(/\s+/);
    const clipped = words.length > 1200 ? words.slice(0, 1200).join(" ") : md;
    return { status: "ok", markdown: clipped };
  } catch {
    return { status: "inaccessible" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;

    // Rate limit com baldes separados:
    //  - caminho 1 (prefetch anônimo no gate): 5/hora por IP
    //  - caminho 2 (onboarding autenticado): 20/hora por user_id
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      // Identifica usuário autenticado (verify_jwt=false, validamos manualmente).
      let userId: string | null = null;
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : "";
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (token && supabaseUrl && anonKey && token !== anonKey) {
        try {
          const ures = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
          });
          if (ures.ok) {
            const u = await ures.json().catch(() => null);
            if (u?.id) userId = u.id as string;
          }
        } catch (_) { /* segue como anônimo */ }
      }

      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
        || req.headers.get("cf-connecting-ip")
        || req.headers.get("x-real-ip")
        || "unknown";

      const bucketKey = userId ? `user:${userId}` : `ip:${ip}`;
      const bucketName = userId
        ? "ivero_onboarding_analyze_auth"
        : "ivero_onboarding_analyze_anon";
      const bucketMax = userId ? 20 : 5;

      if (supabaseUrl && serviceKey) {
        const rl = await fetch(`${supabaseUrl}/rest/v1/rpc/check_and_increment_rate_limit`, {
          method: "POST",
          headers: {
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_ip: bucketKey,
            p_function: bucketName,
            p_max: bucketMax,
            p_window: "01:00:00",
          }),
        });
        if (rl.ok) {
          const allowed = await rl.json();
          if (allowed === false) {
            return new Response(
              JSON.stringify({
                error: "rate_limited",
                message: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }
      }
    } catch (_) {
      // Falha no rate limit não bloqueia a análise.
    }


    const apiKey = Deno.env.get("Key_antropic_claude");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Chave da IA não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: "site_inaccessible", message: "Não foi possível acessar o site informado." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const scrapeResult = await firecrawlScrape(normalizedUrl, firecrawlKey);
    if (scrapeResult.status === "inaccessible") {
      return new Response(
        JSON.stringify({ error: "site_inaccessible", message: "Não foi possível acessar o site informado.", normalized_url: normalizedUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (scrapeResult.status === "insufficient") {
      return new Response(
        JSON.stringify({ error: "insufficient_content", message: "O site não retornou conteúdo suficiente para análise.", normalized_url: normalizedUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const scraped = scrapeResult.markdown;

    const prompt = `Você é um analista de marca. Com base nas informações abaixo de um site, retorne APENAS um JSON estrito (sem markdown) com os dados da marca.

URL: ${normalizedUrl}

CONTEÚDO REAL DO SITE (extraído):
${scraped}

Retorne EXATAMENTE este schema em Português do Brasil:
{
  "brand_name": string (nome curto e oficial da empresa),
  "description": string (descrição curta, 1-2 frases, do que a empresa faz e para quem),
  "sector": string (segmento/categoria de mercado, ex: "SaaS B2B", "E-commerce de moda", "Clínica odontológica"),
  "competitors": string[] (3 a 5 nomes de concorrentes prováveis, reais e relevantes para o mercado e região da marca)
}`;

    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: SONNET_MODEL,
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Anthropic ${resp.status}: ${text.slice(0, 300)}`);
    }

    const data = await resp.json();
    const content = data?.content?.[0]?.text ?? "";
    const parsed = extractJson<OnboardingResult>(content);

    // Sanitiza
    const competitors = Array.isArray(parsed.competitors)
      ? parsed.competitors.filter((c) => typeof c === "string" && c.trim().length > 0).slice(0, 5)
      : [];

    return new Response(
      JSON.stringify({
        brand_name: (parsed.brand_name || "").trim(),
        description: (parsed.description || "").trim(),
        sector: (parsed.sector || "").trim(),
        competitors,
        scraped: scraped.length > 0,
        normalized_url: normalizedUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("ivero-onboarding-analyze error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
