import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  url: z.string().trim().min(4).max(500),
});

type CheckStatus = 'ok' | 'warning' | 'critical';
interface Check {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
}

function normalizeUrl(raw: string): string | null {
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withProto);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

async function fetchLlmsTxt(origin: string) {
  const url = `${origin}/llms.txt`;
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Ivero-LLMsTxt-Diagnostic/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { url, found: false as const, status: res.status };
    const contentType = res.headers.get('content-type') || '';
    const lastModified = res.headers.get('last-modified');
    const text = await res.text();
    // Some servers return HTML 200 SPA fallback — guard against it
    const looksLikeHtml = /<html[\s>]/i.test(text.slice(0, 500));
    if (looksLikeHtml) return { url, found: false as const, status: 200 };
    return { url, found: true as const, status: 200, contentType, lastModified, text };
  } catch (_e) {
    return { url, found: false as const, status: 0 };
  }
}

function runChecks(text: string, lastModified: string | null): Check[] {
  const trimmed = text.trim();
  const lines = trimmed.split(/\r?\n/);

  const hasH1 = /^#\s+\S/m.test(trimmed) && /^#\s+\S/.test(lines[0] || '');
  const hasMarkdownStructure = /^#{1,6}\s+/m.test(trimmed) || /^- \[/m.test(trimmed);
  const h1Line = lines.find((l) => /^#\s+\S/.test(l)) || '';
  const afterH1Idx = lines.indexOf(h1Line);
  const descriptionBlock = afterH1Idx >= 0
    ? lines.slice(afterH1Idx + 1).find((l) => l.trim().length > 30 && !l.startsWith('#'))
    : undefined;
  const hasDescription = !!descriptionBlock;
  const hasLinks = /^\s*-\s*\[[^\]]+\]\(https?:[^)]+\)/m.test(trimmed);
  const linkCount = (trimmed.match(/\]\(https?:\/\//g) || []).length;
  const hasSectionHeadings = /^##\s+\S/m.test(trimmed);
  const sectionsWithDesc = (() => {
    const sections = trimmed.split(/^##\s+/m).slice(1);
    if (!sections.length) return false;
    return sections.some((s) => s.split(/\r?\n/).slice(1).some((l) => l.trim().length > 20));
  })();

  let freshness: CheckStatus = 'warning';
  let freshnessDesc = 'Não foi possível detectar a data de modificação do arquivo.';
  if (lastModified) {
    const lm = new Date(lastModified);
    const ageDays = (Date.now() - lm.getTime()) / 86_400_000;
    if (ageDays <= 30) {
      freshness = 'ok';
      freshnessDesc = `Última atualização há ${Math.round(ageDays)} dia(s).`;
    } else if (ageDays <= 90) {
      freshness = 'warning';
      freshnessDesc = `Atualizado há ${Math.round(ageDays)} dias — considere revisar.`;
    } else {
      freshness = 'critical';
      freshnessDesc = `Sem atualização há ${Math.round(ageDays)} dias.`;
    }
  }

  const conflictMarkers = /(lorem ipsum|TODO|FIXME|placeholder)/i.test(trimmed);

  return [
    {
      id: 'present',
      label: 'Arquivo llms.txt presente na raiz do domínio',
      description: 'O arquivo foi encontrado e respondido com sucesso pelo servidor.',
      status: 'ok',
    },
    {
      id: 'markdown',
      label: 'Estrutura em markdown válida',
      description: hasMarkdownStructure
        ? 'O conteúdo segue a sintaxe markdown esperada.'
        : 'O arquivo não apresenta marcação markdown reconhecível.',
      status: hasMarkdownStructure ? 'ok' : 'critical',
    },
    {
      id: 'h1',
      label: 'Título H1 da marca presente',
      description: hasH1
        ? `Título identificado: "${h1Line.replace(/^#\s+/, '').slice(0, 80)}".`
        : 'Não encontramos um título H1 (linha iniciada com "# ") no topo do arquivo.',
      status: hasH1 ? 'ok' : 'critical',
    },
    {
      id: 'description',
      label: 'Descrição da empresa incluída',
      description: hasDescription
        ? 'Um parágrafo descritivo foi encontrado logo após o título.'
        : 'Adicione um parágrafo curto descrevendo o que a empresa faz.',
      status: hasDescription ? 'ok' : 'warning',
    },
    {
      id: 'links',
      label: 'Links das páginas principais listados',
      description: hasLinks
        ? `${linkCount} link(s) identificado(s) apontando para suas páginas.`
        : 'Nenhuma lista de links no formato `- [Página](https://...)` foi encontrada.',
      status: hasLinks ? 'ok' : 'critical',
    },
    {
      id: 'sections',
      label: 'Descrições por seção presentes',
      description: sectionsWithDesc
        ? 'As seções (##) possuem descrição contextual.'
        : hasSectionHeadings
          ? 'Seções identificadas, mas sem descrição explicativa.'
          : 'Nenhuma seção (##) foi encontrada — agrupe os links em categorias.',
      status: sectionsWithDesc ? 'ok' : 'warning',
    },
    {
      id: 'freshness',
      label: 'Conteúdo atualizado (menos de 30 dias)',
      description: freshnessDesc,
      status: freshness,
    },
    {
      id: 'conflicts',
      label: 'Ausência de conteúdo desatualizado ou conflitante',
      description: conflictMarkers
        ? 'Detectamos marcadores de placeholder (lorem ipsum, TODO, etc.).'
        : 'Nenhum marcador de conteúdo provisório foi detectado.',
      status: conflictMarkers ? 'critical' : 'ok',
    },
  ];
}

function computeScore(checks: Check[]): number {
  const weights: Record<CheckStatus, number> = { ok: 1, warning: 0.5, critical: 0 };
  const total = checks.reduce((s, c) => s + weights[c.status], 0);
  return Math.round((total / checks.length) * 100);
}

function overallState(score: number, found: boolean): 'found_ok' | 'found_issues' | 'not_found' {
  if (!found) return 'not_found';
  return score >= 80 ? 'found_ok' : 'found_issues';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'URL inválida.', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const origin = normalizeUrl(parsed.data.url);
    if (!origin) {
      return new Response(JSON.stringify({ error: 'URL inválida.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await fetchLlmsTxt(origin);

    if (!result.found) {
      const notFoundChecks: Check[] = [
        {
          id: 'present',
          label: 'Arquivo llms.txt presente na raiz do domínio',
          description: `Nenhum arquivo encontrado em ${result.url} (status ${result.status}).`,
          status: 'critical',
        },
        ...['markdown', 'h1', 'description', 'links', 'sections', 'freshness', 'conflicts'].map((id) => ({
          id,
          label: ({
            markdown: 'Estrutura em markdown válida',
            h1: 'Título H1 da marca presente',
            description: 'Descrição da empresa incluída',
            links: 'Links das páginas principais listados',
            sections: 'Descrições por seção presentes',
            freshness: 'Conteúdo atualizado (menos de 30 dias)',
            conflicts: 'Ausência de conteúdo desatualizado ou conflitante',
          } as Record<string, string>)[id],
          description: 'Não avaliável — arquivo ausente.',
          status: 'critical' as CheckStatus,
        })),
      ];

      return new Response(
        JSON.stringify({
          origin,
          fileUrl: result.url,
          state: 'not_found',
          score: 0,
          lastModified: null,
          checks: notFoundChecks,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const checks = runChecks(result.text, result.lastModified || null);
    const score = computeScore(checks);
    const state = overallState(score, true);

    return new Response(
      JSON.stringify({
        origin,
        fileUrl: result.url,
        state,
        score,
        lastModified: result.lastModified,
        checks,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('diagnose-llms-txt error', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
