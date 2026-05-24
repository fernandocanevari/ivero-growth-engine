import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  url: z.string().trim().min(4).max(500),
});

function normalizeUrl(raw: string): string | null {
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withProto);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    brandName: { type: 'string', description: 'Nome oficial da marca ou empresa' },
    description: { type: 'string', description: 'Descrição curta da empresa (1-2 frases, máx 280 caracteres)' },
    brandPositioning: { type: 'string', description: 'O que as IAs devem saber sobre a marca: diferenciais, público, valores (3-5 frases)' },
    language: { type: 'string', enum: ['pt-BR', 'en', 'es'], description: 'Idioma principal detectado' },
    mainPages: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          description: { type: 'string', description: '1 linha descrevendo a página' },
        },
        required: ['title', 'url', 'description'],
      },
    },
    sections: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string', description: '1 linha sobre o que essa seção contém' },
        },
        required: ['name', 'description'],
      },
    },
  },
  required: ['brandName', 'description', 'brandPositioning', 'language', 'mainPages', 'sections'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY não configurada.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'URL inválida.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const origin = normalizeUrl(parsed.data.url);
    if (!origin) {
      return new Response(JSON.stringify({ error: 'URL inválida.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: origin,
        onlyMainContent: true,
        formats: [
          'markdown',
          'links',
          {
            type: 'json',
            schema: EXTRACTION_SCHEMA,
            prompt:
              'Extraia informações estruturadas sobre esta marca para gerar um arquivo llms.txt em português. Inclua nome, descrição curta, posicionamento e até 8 páginas principais com URL absoluta e descrição em 1 linha. Para as seções, agrupe categorias relevantes do site.',
          },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Firecrawl error', res.status, data);
      return new Response(
        JSON.stringify({
          error: `Falha ao extrair conteúdo (${res.status}). ${data?.error || ''}`.trim(),
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = data?.data ?? data;
    const extracted = payload?.json ?? {};
    const metadata = payload?.metadata ?? {};

    const fallback = {
      brandName: extracted.brandName || metadata.title || new URL(origin).hostname,
      description: extracted.description || metadata.description || '',
      brandPositioning: extracted.brandPositioning || '',
      language: extracted.language || 'pt-BR',
      mainPages: Array.isArray(extracted.mainPages) ? extracted.mainPages : [],
      sections: Array.isArray(extracted.sections) ? extracted.sections : [],
    };

    return new Response(
      JSON.stringify({ origin, ...fallback }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('generate-llms-txt error', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
