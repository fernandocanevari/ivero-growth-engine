import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  monitoring_id: z.string().uuid().optional(),
}).optional();

type Frequency = 'daily' | 'weekly' | 'biweekly';

interface MonitoringRow {
  id: string;
  user_id: string;
  monitored_url: string;
  frequency: Frequency;
  last_site_hash: string | null;
  last_llms_hash: string | null;
  llms_present: boolean | null;
  alerts_sent: number;
  pending_alert: boolean;
}

function nextCheckAt(freq: Frequency, from = new Date()): string {
  const d = new Date(from);
  if (freq === 'daily') d.setUTCDate(d.getUTCDate() + 1);
  else if (freq === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCDate(d.getUTCDate() + 14);
  return d.toISOString();
}

function normalizeOrigin(raw: string): string | null {
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withProto);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50_000);
}

async function safeFetch(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Ivero-LLMsTxt-Monitor/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch {
    return { ok: false, status: 0, text: '' };
  }
}

async function runCheck(supabase: ReturnType<typeof createClient>, row: MonitoringRow) {
  const origin = normalizeOrigin(row.monitored_url);
  if (!origin) {
    return { status: 'error', changes: { error: 'invalid url' } };
  }
  const [site, llms] = await Promise.all([safeFetch(origin), safeFetch(`${origin}/llms.txt`)]);

  const siteHash = site.ok ? await sha256Hex(stripHtml(site.text)) : null;
  const llmsPresent = llms.ok && !/<html[\s>]/i.test(llms.text.slice(0, 500));
  const llmsHash = llmsPresent ? await sha256Hex(llms.text.trim()) : null;

  let status: 'unchanged' | 'changed' | 'file_removed' | 'error' = 'unchanged';
  const changes: Record<string, unknown> = {};

  if (row.llms_present === true && !llmsPresent) {
    status = 'file_removed';
    changes.llms_removed = true;
  } else if (row.last_site_hash && siteHash && row.last_site_hash !== siteHash) {
    status = 'changed';
    changes.site_changed = true;
  } else if (row.last_llms_hash && llmsHash && row.last_llms_hash !== llmsHash) {
    status = 'changed';
    changes.llms_changed = true;
  } else if (!siteHash && row.last_site_hash) {
    status = 'error';
    changes.fetch_failed = true;
  }

  const now = new Date().toISOString();
  await supabase.from('llms_monitoring_checks').insert({
    monitoring_id: row.id,
    user_id: row.user_id,
    status,
    changes,
    checked_at: now,
  });

  const shouldAlert = status === 'changed' || status === 'file_removed';
  const update: Record<string, unknown> = {
    last_check_at: now,
    next_check_at: nextCheckAt(row.frequency),
    last_site_hash: siteHash ?? row.last_site_hash,
    last_llms_hash: llmsHash ?? row.last_llms_hash,
    llms_present: llmsPresent,
  };
  if (shouldAlert) {
    update.pending_alert = true;
    update.alerts_sent = row.alerts_sent + 1;
    update.pending_alert_summary =
      status === 'file_removed'
        ? 'Arquivo llms.txt removido do domínio.'
        : 'Alterações detectadas no conteúdo do site.';
    // TODO: enviar e-mail real após configurar o domínio de e-mail.
  }
  await supabase.from('llms_monitoring').update(update).eq('id', row.id);

  return { status, changes };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const parsed = BodySchema.safeParse(body);
    const monitoring_id = parsed.success ? parsed.data?.monitoring_id : undefined;

    let rows: MonitoringRow[];
    if (monitoring_id) {
      const { data, error } = await supabase
        .from('llms_monitoring')
        .select('id,user_id,monitored_url,frequency,last_site_hash,last_llms_hash,llms_present,alerts_sent,pending_alert')
        .eq('id', monitoring_id)
        .limit(1);
      if (error) throw error;
      rows = (data ?? []) as MonitoringRow[];
    } else {
      const { data, error } = await supabase
        .from('llms_monitoring')
        .select('id,user_id,monitored_url,frequency,last_site_hash,last_llms_hash,llms_present,alerts_sent,pending_alert')
        .eq('paused', false)
        .lte('next_check_at', new Date().toISOString())
        .limit(50);
      if (error) throw error;
      rows = (data ?? []) as MonitoringRow[];
    }

    const results = [];
    for (const row of rows) {
      try {
        const r = await runCheck(supabase, row);
        results.push({ id: row.id, ...r });
      } catch (err) {
        console.error('check failed', row.id, err);
        results.push({ id: row.id, status: 'error', error: err instanceof Error ? err.message : 'unknown' });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('monitor-llms-txt error', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
