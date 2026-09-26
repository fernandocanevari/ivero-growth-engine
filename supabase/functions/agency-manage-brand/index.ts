// agency-manage-brand — adiciona/remove marca da assinatura-mãe da agência.
// Recalcula o valor consolidado (desconto de volume) e atualiza a assinatura
// no Asaas (PUT /subscriptions/{id}). Adição no meio do ciclo gera 1 cobrança
// avulsa pró-rata (externalReference "prorata:..." → webhook não promove plano).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { asaasApiKey, asaasBaseUrl, asaasKeyName } from "../_shared/asaas.ts";
import { normalizeCiclo, type PlanoKey } from "../_shared/pricing.ts";
import { quoteAgency, highestPlan } from "../_shared/agency-pricing.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PLANOS = ["presenca", "influencia", "autoridade"];
const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
    const url = Deno.env.get("SUPABASE_URL")!;
    const auth = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: cErr } = await auth.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims) return json(401, { error: "Unauthorized" });
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const brandId = String(body?.brand_id ?? "");
    const plano = body?.plano as PlanoKey | undefined;
    if (!["add_brand", "remove_brand", "quote"].includes(action)) return json(400, { error: "action inválida" });
    if (action !== "quote" && !UUID.test(brandId)) return json(400, { error: "brand_id inválido" });
    if (action === "add_brand" && (!plano || !PLANOS.includes(plano))) return json(400, { error: "plano inválido" });

    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: prof } = await db.from("profiles").select("account_type").eq("user_id", userId).maybeSingle();
    if (prof?.account_type !== "agency") return json(403, { error: "Conta não é de agência." });

    const { data: sub } = await db.from("assinaturas")
      .select("id, status, ciclo_contratado, asaas_subscription_id, asaas_customer_id")
      .eq("user_id", userId).in("status", ["ativo", "trial", "pendente", "inadimplente", "atrasado"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    const { data: links } = await db.from("agency_brands").select("id, brand_id, plano, status")
      .eq("agency_user_id", userId);
    const target = (links ?? []).find((l) => l.brand_id === brandId);
    if (action !== "quote" && !target) return json(404, { error: "Marca não pertence à agência." });

    const ciclo = normalizeCiclo(sub?.ciclo_contratado ?? "mensal");
    const current = (links ?? []).filter((l) => l.status === "ativo" && l.plano)
      .map((l) => ({ brand_id: l.brand_id as string, plano: l.plano as PlanoKey }));
    let next = current.filter((b) => b.brand_id !== brandId);
    if (action === "add_brand") next = [...next, { brand_id: brandId, plano: plano! }];
    const before = quoteAgency(current, ciclo);
    const after = quoteAgency(next, ciclo);
    if (action === "quote") return json(200, { before, after });

    // Sem assinatura paga vinculada: nada a cobrar agora — a marca entra no
    // próximo checkout consolidado (create-checkout em modo agência).
    if (!sub || sub.status !== "ativo" || !sub.asaas_subscription_id) {
      return json(409, { error: "sem_assinatura_ativa", message: "Ative a assinatura da agência para incluir marcas." });
    }
    if (action === "remove_brand" && next.length === 0) {
      return json(400, { error: "A agência precisa manter ao menos 1 marca. Para encerrar, cancele a assinatura." });
    }

    const key = asaasApiKey();
    if (!key) return json(500, { error: `${asaasKeyName()} não configurada.` });
    const H = { "Content-Type": "application/json", "access_token": key };
    const base = asaasBaseUrl();
    const call = async (path: string, init: RequestInit = {}) => {
      const r = await fetch(`${base}${path}`, { headers: H, ...init });
      const t = await r.text();
      let j: Record<string, any> | null = null;
      try { j = t ? JSON.parse(t) : null; } catch { /* vazio */ }
      return { ok: r.ok, status: r.status, json: j, text: t };
    };

    const cur = await call(`/subscriptions/${sub.asaas_subscription_id}`);
    if (!cur.ok) return json(502, { error: "Não foi possível ler a assinatura no provedor de pagamentos." });
    const oldValue = Number(cur.json?.value ?? before.total);
    const nextDue: string | null = cur.json?.nextDueDate ?? null;
    const customerId: string | null = cur.json?.customer ?? sub.asaas_customer_id ?? null;
    const pend = await call(`/subscriptions/${sub.asaas_subscription_id}/payments?status=PENDING&limit=1`);
    const hasPending = Array.isArray(pend.json?.data) && pend.json!.data.length > 0;

    const upd = await call(`/subscriptions/${sub.asaas_subscription_id}`, {
      method: "PUT",
      body: JSON.stringify({
        value: after.total,
        updatePendingPayments: true,
        description: `Ivero — Agência (${next.length} marcas)`,
      }),
    });
    if (!upd.ok) {
      console.error("agency-manage-brand PUT error", upd.status, upd.text.slice(0, 400));
      return json(502, { error: upd.json?.errors?.[0]?.description || "Não foi possível atualizar a assinatura." });
    }

    // Pró-rata só para aumento de valor com ciclo atual já pago.
    const msDay = 86_400_000;
    const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
    const dueTs = nextDue ? new Date(nextDue).getTime() : NaN;
    const daysLeft = Number.isNaN(dueTs) ? 0 : Math.max(0, Math.min(30, Math.round((dueTs - today) / msDay)));
    const delta = after.total - oldValue;
    const proRataValue = delta > 0 && !hasPending ? Math.round((delta * daysLeft / 30) * 100) / 100 : 0;
    let proRata: { value: number; days: number; invoiceUrl: string | null } | null = null;
    if (proRataValue >= 5 && customerId) {
      const pay = await call(`/payments`, {
        method: "POST",
        body: JSON.stringify({
          customer: customerId,
          billingType: "UNDEFINED",
          value: proRataValue,
          dueDate: new Date().toISOString().slice(0, 10),
          description: `Ivero — marca adicionada à agência (${daysLeft} dia(s) restantes do ciclo)`,
          externalReference: `prorata:${sub.id}:agency:${brandId}`,
        }),
      });
      if (pay.ok) proRata = { value: proRataValue, days: daysLeft, invoiceUrl: pay.json?.invoiceUrl ?? null };
      else console.error("agency-manage-brand prorata error", pay.status, pay.text.slice(0, 400));
    }

    if (action === "add_brand") {
      await db.from("agency_brands").update({ plano, plano_pretendido: null, status: "ativo" }).eq("id", target!.id);
    } else {
      await db.from("agency_brands").update({ status: "removido" }).eq("id", target!.id);
    }
    await db.from("assinaturas").update({
      plano: highestPlan(next.map((b) => b.plano)),
      valor_consolidado: after.total,
      desconto_volume_pct: after.discountPct,
    }).eq("id", sub.id);

    console.log("agency-manage-brand", action, userId, brandId, "old:", oldValue, "new:", after.total, "prorata:", proRata?.value ?? 0);
    return json(200, { ok: true, before, after, proRata });
  } catch (e) {
    console.error("agency-manage-brand error", e);
    return json(500, { error: (e as Error).message });
  }
});
