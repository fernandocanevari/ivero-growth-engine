import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { promoteAgencyIntent } from "../_shared/agency-promote.ts";
import { asaasApiKey, asaasBaseUrl, asaasKeyName } from "../_shared/asaas.ts";
import { decideReconcile, PAID_PAYMENT_STATUSES } from "../_shared/reconcile-decision.ts";

const ASAAS_BASE_URL = asaasBaseUrl();

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * reconcile-asaas — rede de segurança para quando o webhook do Asaas não chega.
 *
 * Consulta o Asaas diretamente (Checkout Session salva em
 * assinaturas.asaas_checkout_id e, como reforço, assinaturas por
 * externalReference = user_id). Se o pagamento já foi processado lá,
 * libera o acesso local (status='ativo') e grava os IDs do Asaas.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json(401, { error: "Unauthorized" });
    const userId = claimsData.claims.sub as string;

    const asaasKey = asaasApiKey();
    if (!asaasKey) return json(500, { error: `${asaasKeyName()} não configurada.` });
    const asaasHeaders = { "Content-Type": "application/json", "access_token": asaasKey };

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // Ação administrativa: conferir/configurar o webhook do Asaas (só admin).
    let body: Record<string, any> = {};
    try { body = await req.json(); } catch { /* sem corpo */ }
    if (body?.action === "webhook_status" || body?.action === "webhook_fix") {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) return json(403, { error: "forbidden" });
      const expectedUrl = `${supabaseUrl}/functions/v1/asaas-webhook`;
      const listRes = await fetch(`${ASAAS_BASE_URL}/webhooks`, { headers: asaasHeaders });
      const list = await listRes.json().catch(() => null);
      const hooks = (list?.data ?? []).map((h: Record<string, any>) => ({
        id: h.id, name: h.name, url: h.url, enabled: h.enabled, interrupted: h.interrupted,
        events: h.events, sendType: h.sendType, hasAuthToken: !!h.authToken,
      }));
      if (body.action === "webhook_status") return json(200, { expectedUrl, hooks });
      const token = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
      const payload = {
        name: "Ivero", url: expectedUrl, email: "contato@ivero.com.br", enabled: true,
        interrupted: false, apiVersion: 3, authToken: token, sendType: "SEQUENTIALLY",
        events: [
          "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_DELETED",
          "CHECKOUT_PAID", "CHECKOUT_CANCELED", "CHECKOUT_EXPIRED",
          "SUBSCRIPTION_CREATED", "SUBSCRIPTION_UPDATED", "SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED",
        ],
      };
      const existing = (list?.data ?? []).find((h: Record<string, any>) => h.url === expectedUrl);
      const res = await fetch(`${ASAAS_BASE_URL}/webhooks${existing ? `/${existing.id}` : ""}`, {
        method: existing ? "PUT" : "POST", headers: asaasHeaders, body: JSON.stringify(payload),
      });
      const out = await res.json().catch(() => null);
      return json(res.status, { updated: !!existing, id: out?.id, enabled: out?.enabled, interrupted: out?.interrupted, errors: out?.errors });
    }


    const getJson = async (path: string) => {
      const res = await fetch(`${ASAAS_BASE_URL}${path}`, { headers: asaasHeaders });
      const text = await res.text();
      let data: Record<string, any> | null = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }
      return { status: res.status, data, text };
    };

    // Ação administrativa SOMENTE LEITURA: estado real no Asaas de uma conta.
    if (body?.action === "inspect_user") {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) return json(403, { error: "forbidden" });
      const { data: r } = await supabase.from("assinaturas")
        .select("id, status, plano, ciclos_pagos, asaas_checkout_id, asaas_subscription_id")
        .eq("user_id", body.user_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!r) return json(200, { row: null });
      const ck = r.asaas_checkout_id ? await getJson(`/checkouts/${r.asaas_checkout_id}`) : null;
      const sub = r.asaas_subscription_id ? await getJson(`/subscriptions/${r.asaas_subscription_id}`) : null;
      const pays = r.asaas_subscription_id ? await getJson(`/payments?subscription=${r.asaas_subscription_id}&limit=20`) : null;
      return json(200, {
        row: r,
        checkout: ck && { http: ck.status, status: ck.data?.status, subscription: ck.data?.subscription?.nextDueDate ?? ck.data?.subscription },
        subscription: sub && { http: sub.status, status: sub.data?.status, value: sub.data?.value, nextDueDate: sub.data?.nextDueDate, billingType: sub.data?.billingType, dateCreated: sub.data?.dateCreated },
        payments: (pays?.data?.data ?? []).map((p: Record<string, any>) => ({ id: p.id, status: p.status, value: p.value, dueDate: p.dueDate, paymentDate: p.paymentDate, confirmedDate: p.confirmedDate, billingType: p.billingType })),
      });
    }

    const LIVE_STATUSES = ["ativo", "trial", "pendente", "inadimplente", "atrasado"];
    const { data: row } = await supabase
      .from("assinaturas")
      .select(
        "id, status, plano, plano_pretendido, ciclo_pretendido, asaas_checkout_id, asaas_checkout_created_at, asaas_subscription_id, asaas_customer_id, trial_ends_at",
      )
      .eq("user_id", userId)
      .in("status", LIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return json(200, { reconciled: false, reason: "no_subscription" });
    if (row.status === "ativo") return json(200, { reconciled: false, status: "ativo" });

    let subscriptionId: string = (row.asaas_subscription_id as string) ?? "";
    let customerId: string = (row.asaas_customer_id as string) ?? "";
    let checkoutStatus = "";
    // Status de TODAS as cobranças encontradas; só RECEIVED/CONFIRMED valem.
    const paymentStatuses: string[] = [];
    const hasConfirmed = () => paymentStatuses.some((s) => PAID_PAYMENT_STATUSES.includes(s));

    // 1) Checkout Session — o status da sessão sozinho NÃO prova pagamento
    // (ACTIVE = sessão aberta). Ver _shared/reconcile-decision.ts.
    if (row.asaas_checkout_id) {
      const ck = await getJson(`/checkouts/${row.asaas_checkout_id}`);
      const data = ck.data;
      checkoutStatus = data?.status ?? "";
      console.log("[reconcile-asaas] checkout", row.asaas_checkout_id, ck.status, checkoutStatus, ck.text.slice(0, 500));
      const sub = data?.subscription;
      subscriptionId = (typeof sub === "string" ? sub : sub?.id) || subscriptionId;
      const cus = data?.customer;
      customerId = (typeof cus === "string" ? cus : cus?.id) || customerId;

      const pays = await getJson(`/payments?checkoutSession=${encodeURIComponent(row.asaas_checkout_id as string)}&limit=20`);
      const list: Record<string, any>[] = pays.data?.data ?? [];
      console.log("[reconcile-asaas] payments by checkoutSession", pays.status, list.length);
      for (const p of list) {
        if (p?.checkoutSession && p.checkoutSession !== row.asaas_checkout_id) continue;
        if (p?.subscription) subscriptionId = subscriptionId || p.subscription;
        if (p?.customer) customerId = customerId || p.customer;
        if (p?.status) paymentStatuses.push(p.status);
      }
      if (!subscriptionId) {
        const subs = await getJson(`/subscriptions?checkoutSession=${encodeURIComponent(row.asaas_checkout_id as string)}&limit=10`);
        const s = (subs.data?.data ?? []).find((x: Record<string, any>) =>
          !x?.checkoutSession || x.checkoutSession === row.asaas_checkout_id
        );
        console.log("[reconcile-asaas] subscriptions by checkoutSession", subs.status, s?.id, s?.status);
        if (s?.id) {
          subscriptionId = s.id;
          customerId = customerId || s.customer;
        }
      }
      if (!hasConfirmed() && subscriptionId) {
        const pays2 = await getJson(`/payments?subscription=${subscriptionId}&limit=10`);
        for (const p of pays2.data?.data ?? []) if (p?.status) paymentStatuses.push(p.status);
        console.log("[reconcile-asaas] payments by subscription", subscriptionId, pays2.status, JSON.stringify((pays2.data?.data ?? []).map((p: Record<string, any>) => [p.status, p.dueDate, p.value, p.billingType])));
      }
    }

    // 2) Reforço: assinaturas do Asaas por externalReference (user_id)
    if (!hasConfirmed() && !subscriptionId) {
      const subs = await getJson(`/subscriptions?externalReference=${encodeURIComponent(userId)}`);
      const sub = subs.data?.data?.[0];
      console.log("[reconcile-asaas] subscriptions lookup", subs.status, sub?.id, sub?.status);
      if (sub?.id) {
        subscriptionId = sub.id;
        customerId = sub.customer || customerId;
        const pays = await getJson(`/payments?subscription=${sub.id}&limit=10`);
        for (const p of pays.data?.data ?? []) if (p?.status) paymentStatuses.push(p.status);
      }
    }

    const outcome = decideReconcile({ checkoutStatus, paymentStatuses });
    console.log("[reconcile-asaas] decisão", row.id, outcome, checkoutStatus, JSON.stringify(paymentStatuses));

    if (outcome !== "activate") {
      // Tentativa de pagamento abandonada: checkout expirado/cancelado no Asaas
      // ou criado há mais de 1h sem confirmação. Normaliza para trial_expirado
      // em vez de deixar a conta presa em "pendente" para sempre.
      const CHECKOUT_EXPIRY_MS = 60 * 60 * 1000;
      const createdAt = row.asaas_checkout_created_at
        ? new Date(row.asaas_checkout_created_at as string).getTime()
        : NaN;
      const tooOld = Number.isNaN(createdAt)
        ? false
        : Date.now() - createdAt > CHECKOUT_EXPIRY_MS;

      if (row.status === "pendente" && (tooOld || outcome === "closed")) {
        await supabase
          .from("assinaturas")
          .update({
            // 'expirado' é o valor aceito pelo constraint do banco; a leitura
            // deriva isso para "trial_expirado" (resolveEffectiveStatus).
            status: "expirado",
            plano_pretendido: null,
            ciclo_pretendido: null,
            asaas_checkout_id: null,
            ...(subscriptionId ? { asaas_subscription_id: subscriptionId } : {}),
            ...(customerId ? { asaas_customer_id: customerId } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        console.log("[reconcile-asaas] checkout expirado, assinatura normalizada:", row.id);
        return json(200, {
          reconciled: false,
          expired: true,
          status: "trial_expirado",
          checkoutStatus,
        });
      }

      // Sem pagamento confirmado: só vincula os IDs (trial elegível com 1ª
      // cobrança agendada fica 'trial', com os planos pretendidos intactos).
      if (subscriptionId || customerId) {
        await supabase
          .from("assinaturas")
          .update({
            ...(subscriptionId ? { asaas_subscription_id: subscriptionId } : {}),
            ...(customerId ? { asaas_customer_id: customerId } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }
      return json(200, { reconciled: false, status: row.status, checkoutStatus, outcome });
    }

    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 30);
    const { error } = await supabase
      .from("assinaturas")
      .update({
        status: "ativo",
        carencia_ate: null,
        trial_ends_at: null,
        data_vencimento: nextDue.toISOString(),
        // Pagamento confirmado → a intenção gravada no checkout vale agora.
        ...(row.plano_pretendido
          ? {
              plano: row.plano_pretendido as string,
              plano_pretendido: null,
              ciclo_pretendido: null,
              ...(row.ciclo_pretendido
                ? { ciclo_contratado: row.ciclo_pretendido as string }
                : {}),
            }
          : {}),
        ...(subscriptionId ? { asaas_subscription_id: subscriptionId } : {}),
        ...(customerId ? { asaas_customer_id: customerId } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);


    if (error) {
      console.error("[reconcile-asaas] update error:", error);
      return json(500, { error: error.message });
    }

    // Único ponto de promoção das marcas aqui: outcome === "activate"
    // (cobrança CONFIRMED/RECEIVED no Asaas).
    await promoteAgencyIntent(supabase, userId, row.id as string);
    console.log("[reconcile-asaas] assinatura liberada via reconciliação:", row.id);
    return json(200, { reconciled: true, status: "ativo" });
  } catch (err) {
    console.error("[reconcile-asaas] unexpected error:", err);
    return json(500, { error: (err as Error).message });
  }
});
