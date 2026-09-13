// =====================================================================
// Vitrine IA — motores de busca ao vivo
// =====================================================================
// ISOLAMENTO TOTAL: este módulo NÃO é usado pelo simulate-ai nem por
// qualquer caminho do cálculo dos 5 pilares. O diagnóstico oficial segue
// em temperature 0, sem busca. Aqui a busca web é o objetivo.
//
// Métrica do produto = FREQUÊNCIA de citação ao longo do tempo. Uma
// rodada isolada nunca deve ser apresentada como verdade.

export type VitrineEngine = "chatgpt" | "google_ai" | "claude";

export type SourceType = "loja" | "marketplace" | "review" | "outro";

export interface VitrineCitation {
  dominio: string;
  loja_nome: string | null;
  produto_nome: string | null;
  preco_texto: string | null;
  url: string | null;
  url_mascarada: boolean;
  tipo_fonte: SourceType;
  posicao: number;
}

export interface EngineResult {
  engine: VitrineEngine;
  status: "ok" | "erro";
  resposta_texto: string;
  citations: VitrineCitation[];
  custo_usd: number;
  duracao_ms: number;
  erro_msg: string | null;
}

export interface QueryContext {
  pergunta: string;
  pais: string; // "BR"
  idioma: string; // "pt-BR"
  regiao?: string | null;
  marcaNome?: string | null;
  marcaDominio?: string | null;
}

// ---------------------------------------------------------------------
// Região / idioma — obrigatório
// ---------------------------------------------------------------------
// Sem isso o teste real trouxe lojas da Turquia, Japão e Malásia.
// Três camadas: instrução no prompt, parâmetro de localização do
// provedor, e descarte de domínios de país não aceito.

const ALLOWED_TLD_SUFFIXES = [".br", ".com", ".net", ".org", ".store", ".shop", ".io", ".co"];
const BLOCKED_TLD_SUFFIXES = [
  ".tr", ".jp", ".my", ".ru", ".cn", ".in", ".id", ".th", ".vn", ".kr",
  ".pl", ".cz", ".ua", ".ir", ".pk", ".ph", ".mx", ".ar", ".cl", ".co.uk",
  ".de", ".fr", ".it", ".es", ".nl", ".se", ".pt",
];

const MARKETPLACE_DOMAINS = [
  "mercadolivre.com.br", "mercadolibre.com", "amazon.com.br", "amazon.com",
  "magazineluiza.com.br", "americanas.com.br", "shopee.com.br",
  "casasbahia.com.br", "aliexpress.com", "shein.com", "netshoes.com.br",
  "centauro.com.br", "dafiti.com.br", "zattini.com.br", "kabum.com.br",
];

const REVIEW_HINTS = [
  "blog", "review", "resenha", "melhores", "top10", "top-10", "guia",
  "wikipedia.org", "youtube.com", "reddit.com", "quora.com", "medium.com",
  "uol.com.br", "globo.com", "terra.com.br", "g1.globo.com",
];

export function normalizeDomain(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    let host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    return host || null;
  } catch {
    return null;
  }
}

/** Link do Google vem mascarado por redirecionador (vertexaisearch/grounding). */
export function isMaskedUrl(rawUrl: string): boolean {
  const u = rawUrl.toLowerCase();
  return (
    u.includes("vertexaisearch.cloud.google.com") ||
    u.includes("googleusercontent.com/grounding") ||
    u.includes("google.com/url?")
  );
}

export function isDomainAllowedForRegion(dominio: string, pais: string): boolean {
  if (pais.toUpperCase() !== "BR") return true;
  if (dominio.endsWith(".com.br") || dominio.endsWith(".br")) return true;
  if (BLOCKED_TLD_SUFFIXES.some((s) => dominio.endsWith(s))) return false;
  return ALLOWED_TLD_SUFFIXES.some((s) => dominio.endsWith(s));
}

/** Padrão de URL de página de produto — sinal forte de vitrine, não de review. */
const PRODUCT_PATH_RE = /\/(produto|produtos|p\/|dp\/|item|tenis-|sapato)|skuid=|\/p\?|\/p$/i;

export function classifySource(dominio: string, url: string | null): SourceType {
  if (MARKETPLACE_DOMAINS.some((d) => dominio === d || dominio.endsWith("." + d))) {
    // Blog do marketplace ainda é conteúdo editorial.
    if ((url ?? "").toLowerCase().includes("/blog")) return "review";
    return "marketplace";
  }
  const haystack = `${dominio} ${url ?? ""}`.toLowerCase();
  if (REVIEW_HINTS.some((h) => haystack.includes(h))) return "review";
  if (url && PRODUCT_PATH_RE.test(url)) return "loja";
  if (/loja|shop|store|comprar/.test(haystack)) return "loja";
  return "outro";
}

/**
 * Preço citado no mesmo trecho em que a loja/produto aparece. Evita colar o
 * primeiro preço da resposta em todas as lojas — o que seria informação falsa.
 */
export function priceNear(texto: string, termos: string[]): string | null {
  if (!texto) return null;
  const blocos = texto.split(/\n{1,}|(?<=\.)\s{2,}/);
  const alvos = termos.map((t) => t.toLowerCase()).filter((t) => t.length >= 3);
  for (const bloco of blocos) {
    const lower = bloco.toLowerCase();
    if (!alvos.some((t) => lower.includes(t))) continue;
    const p = extractPrices(bloco);
    if (p.length > 0) return p[0];
  }
  return null;
}

export function storeNameFromDomain(dominio: string): string {
  const base = dominio.replace(/\.(com|net|org|store|shop|io|co)(\.br)?$/i, "").replace(/\.br$/i, "");
  const first = base.split(".")[0] ?? base;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** Preço citado no texto, em reais. Usado só como rótulo, nunca como número. */
export function extractPrices(text: string): string[] {
  const matches = text.match(/R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g) ?? [];
  return [...new Set(matches)];
}

export function buildPrompt(ctx: QueryContext): string {
  const regiaoLinha = ctx.regiao?.trim()
    ? `Foque em lojas que atendem ${ctx.regiao.trim()}.`
    : "";
  return [
    `Você é um consumidor brasileiro pesquisando uma compra online.`,
    `Responda SEMPRE em português do Brasil.`,
    `Considere APENAS lojas e páginas que vendem ou atendem o Brasil (domínios .com.br ou lojas com operação brasileira).`,
    `NUNCA cite lojas de outros países (Turquia, Japão, Malásia, Europa, Ásia) — elas não servem para este consumidor.`,
    regiaoLinha,
    ``,
    `Pergunta: ${ctx.pergunta}`,
    ``,
    `Use a busca na web e responda listando de 5 a 10 opções. Para cada uma informe:`,
    `- nome do produto`,
    `- loja onde comprar`,
    `- preço aproximado em reais`,
    `Cite as fontes.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function dedupeCitations(items: VitrineCitation[], pais: string, texto = ""): VitrineCitation[] {
  const seen = new Set<string>();
  const out: VitrineCitation[] = [];
  for (const c of items) {
    if (!c.dominio) continue;
    // Camada 3 do filtro de região: descarta domínio fora do país aceito,
    // exceto quando o link é mascarado (aí não sabemos a origem real).
    if (!c.url_mascarada && !isDomainAllowedForRegion(c.dominio, pais)) continue;
    if (seen.has(c.dominio)) continue;
    seen.add(c.dominio);
    out.push({
      ...c,
      // O preço só é preenchido quando aparece no mesmo trecho da loja/produto.
      preco_texto:
        c.preco_texto ?? priceNear(texto, [c.loja_nome ?? "", c.dominio, c.produto_nome ?? ""]),
      posicao: out.length + 1,
    });
  }
  return out;
}

function citationFrom(url: string, texto: string, produto: string | null): VitrineCitation | null {
  const dominio = normalizeDomain(url);
  if (!dominio) return null;
  const mascarada = isMaskedUrl(url);
  return {
    dominio,
    loja_nome: storeNameFromDomain(dominio),
    produto_nome: produto,
    preco_texto: priceNear(texto, [storeNameFromDomain(dominio), dominio, produto ?? ""]),
    url,
    url_mascarada: mascarada,
    tipo_fonte: classifySource(dominio, url),
    posicao: 0,
  };
}

// ---------------------------------------------------------------------
// ChatGPT — Responses API com a ferramenta web_search
// ---------------------------------------------------------------------
// Confirmado por chamada real: gpt-4o-mini aceita a ferramenta de busca.
// Único motor que devolve link direto de página de produto.
async function runChatGpt(ctx: QueryContext): Promise<EngineResult> {
  const started = Date.now();
  const key = Deno.env.get("key_Open_IA");
  const base: EngineResult = {
    engine: "chatgpt",
    status: "erro",
    resposta_texto: "",
    citations: [],
    custo_usd: 0,
    duracao_ms: 0,
    erro_msg: null,
  };
  if (!key) return { ...base, erro_msg: "Chave da OpenAI ausente", duracao_ms: Date.now() - started };

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: buildPrompt(ctx),
        tools: [
          {
            type: "web_search",
            // Camada 2 do filtro de região.
            user_location: {
              type: "approximate",
              country: ctx.pais.toUpperCase(),
              ...(ctx.regiao ? { city: ctx.regiao } : {}),
            },
          },
        ],
        max_output_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        ...base,
        erro_msg: `HTTP ${res.status}: ${body.slice(0, 200)}`,
        duracao_ms: Date.now() - started,
      };
    }

    const data = await res.json();
    let texto = "";
    const found: VitrineCitation[] = [];
    for (const item of data.output ?? []) {
      for (const part of item.content ?? []) {
        if (typeof part.text === "string") texto += part.text + "\n";
        for (const ann of part.annotations ?? []) {
          if (ann.url) {
            const c = citationFrom(ann.url, texto, ann.title ?? null);
            if (c) found.push(c);
          }
        }
      }
    }
    texto = texto.trim();

    const inTok = data.usage?.input_tokens ?? 0;
    const outTok = data.usage?.output_tokens ?? 0;
    // gpt-4o-mini: US$0,15/M entrada e US$0,60/M saída + taxa de busca.
    const custo = (inTok / 1e6) * 0.15 + (outTok / 1e6) * 0.6 + 0.01;

    return {
      engine: "chatgpt",
      status: "ok",
      resposta_texto: texto,
      citations: dedupeCitations(found, ctx.pais, texto),
      custo_usd: Number(custo.toFixed(5)),
      duracao_ms: Date.now() - started,
      erro_msg: null,
    };
  } catch (e) {
    return {
      ...base,
      erro_msg: e instanceof Error ? e.message : String(e),
      duracao_ms: Date.now() - started,
    };
  }
}

// ---------------------------------------------------------------------
// Google Modo IA — grounding com Google Search (já era o único com busca)
// ---------------------------------------------------------------------
async function runGoogleAi(ctx: QueryContext): Promise<EngineResult> {
  const started = Date.now();
  const key = Deno.env.get("Key_gemini");
  const base: EngineResult = {
    engine: "google_ai",
    status: "erro",
    resposta_texto: "",
    citations: [],
    custo_usd: 0,
    duracao_ms: 0,
    erro_msg: null,
  };
  if (!key) return { ...base, erro_msg: "Chave do Gemini ausente", duracao_ms: Date.now() - started };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildPrompt(ctx) }] }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 1500 },
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      return { ...base, erro_msg: `HTTP ${res.status}: ${body.slice(0, 200)}`, duracao_ms: Date.now() - started };
    }

    const data = await res.json();
    const cand = data.candidates?.[0];
    const texto = (cand?.content?.parts ?? [])
      .map((p: { text?: string }) => p?.text ?? "")
      .join("")
      .trim();

    const found: VitrineCitation[] = [];
    for (const chunk of cand?.groundingMetadata?.groundingChunks ?? []) {
      const uri: string | undefined = chunk?.web?.uri;
      const title: string | undefined = chunk?.web?.title;
      if (!uri) continue;
      // O Google devolve link mascarado + o domínio real em `title`.
      const dominioReal = title && title.includes(".") ? normalizeDomain(`https://${title}`) : null;
      const c = citationFrom(uri, texto, null);
      if (!c) continue;
      if (dominioReal) {
        c.dominio = dominioReal;
        c.loja_nome = storeNameFromDomain(dominioReal);
        c.tipo_fonte = classifySource(dominioReal, uri);
      }
      found.push(c);
    }

    const inTok = data.usageMetadata?.promptTokenCount ?? 0;
    const outTok = data.usageMetadata?.candidatesTokenCount ?? 0;
    const custo = (inTok / 1e6) * 0.3 + (outTok / 1e6) * 2.5;

    return {
      engine: "google_ai",
      status: "ok",
      resposta_texto: texto,
      citations: dedupeCitations(found, ctx.pais, texto),
      custo_usd: Number(custo.toFixed(5)),
      duracao_ms: Date.now() - started,
      erro_msg: null,
    };
  } catch (e) {
    return { ...base, erro_msg: e instanceof Error ? e.message : String(e), duracao_ms: Date.now() - started };
  }
}

// ---------------------------------------------------------------------
// Claude — Messages API com web_search (motor principal: mais consistente)
// ---------------------------------------------------------------------
async function runClaude(ctx: QueryContext): Promise<EngineResult> {
  const started = Date.now();
  const key = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("Key_antropic_claude");
  const base: EngineResult = {
    engine: "claude",
    status: "erro",
    resposta_texto: "",
    citations: [],
    custo_usd: 0,
    duracao_ms: 0,
    erro_msg: null,
  };
  if (!key) return { ...base, erro_msg: "Chave da Anthropic ausente", duracao_ms: Date.now() - started };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{ role: "user", content: buildPrompt(ctx) }],
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 3,
            // Camada 2 do filtro de região.
            user_location: {
              type: "approximate",
              country: ctx.pais.toUpperCase(),
              ...(ctx.regiao ? { city: ctx.regiao } : {}),
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ...base, erro_msg: `HTTP ${res.status}: ${body.slice(0, 200)}`, duracao_ms: Date.now() - started };
    }

    const data = await res.json();
    let texto = "";
    const found: VitrineCitation[] = [];

    for (const block of data.content ?? []) {
      if (block.type === "text" && typeof block.text === "string") {
        texto += block.text + "\n";
        for (const cit of block.citations ?? []) {
          if (cit.url) {
            const c = citationFrom(cit.url, texto, cit.title ?? null);
            if (c) found.push(c);
          }
        }
      }
      if (block.type === "web_search_tool_result") {
        for (const r of block.content ?? []) {
          if (r?.url) {
            const c = citationFrom(r.url, texto, r.title ?? null);
            if (c) found.push(c);
          }
        }
      }
    }
    texto = texto.trim();

    const inTok = data.usage?.input_tokens ?? 0;
    const outTok = data.usage?.output_tokens ?? 0;
    const buscas = data.usage?.server_tool_use?.web_search_requests ?? 0;
    // haiku-4.5: US$1/M entrada, US$5/M saída; busca US$10/mil.
    const custo = (inTok / 1e6) * 1 + (outTok / 1e6) * 5 + buscas * 0.01;

    return {
      engine: "claude",
      status: "ok",
      resposta_texto: texto,
      citations: dedupeCitations(found, ctx.pais, texto),
      custo_usd: Number(custo.toFixed(5)),
      duracao_ms: Date.now() - started,
      erro_msg: null,
    };
  } catch (e) {
    return { ...base, erro_msg: e instanceof Error ? e.message : String(e), duracao_ms: Date.now() - started };
  }
}

/** Claude é o motor principal (mais consistente e previsível em custo). */
export const ENGINE_ORDER: VitrineEngine[] = ["claude", "google_ai", "chatgpt"];

export async function runAllEngines(ctx: QueryContext): Promise<EngineResult[]> {
  const results = await Promise.all([runClaude(ctx), runGoogleAi(ctx), runChatGpt(ctx)]);
  return results;
}

export function marcaCitada(result: EngineResult, ctx: QueryContext): boolean {
  const nome = (ctx.marcaNome ?? "").trim().toLowerCase();
  const dominio = (ctx.marcaDominio ?? "").trim().toLowerCase();
  if (dominio && result.citations.some((c) => c.dominio.includes(dominio))) return true;
  if (nome.length >= 3 && result.resposta_texto.toLowerCase().includes(nome)) return true;
  return false;
}

export function isMarcaDoCliente(dominio: string, ctx: QueryContext): boolean {
  const marca = (ctx.marcaDominio ?? "").trim().toLowerCase();
  if (!marca) return false;
  return dominio === marca || dominio.endsWith("." + marca) || marca.endsWith("." + dominio);
}
