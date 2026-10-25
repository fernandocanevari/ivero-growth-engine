import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { restoreCheckoutState, type CheckoutContext } from "../_shared/checkout-state.ts";
import { promoteAgencyIntent } from "../_shared/agency-promote.ts";
import { asaasApiKey, asaasBaseUrl, asaasKeyName } from "../_shared/asaas.ts";
import {
  evaluateCheckoutPayments, evaluateSubscriptionPayments, selectFallbackSubscription, paymentProofDay, onOrAfterCheckoutDay,
  type AsaasPayment, type AsaasSubscription, type CheckoutEvaluation,
} from "../_shared/reconcile-decision.ts";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
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

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
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

    const listAll = async (path: string) => {
      const items: Record<string, any>[] = [];
      for (let offset = 0; offset < 10000; offset += 100) {
        const result = await getJson(`${path}&limit=100&offset=${offset}`);
        if (result.status !== 200 || !Array.isArray(result.data?.data)) return { items, complete: false };
        items.push(...result.data.data);
        if (!result.data.hasMore) return { items, complete: true };
      }
      return { items, complete: false };
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

    const LIVE_STATUSES = ["ativo", "trial", "pendente", "inadimplente", "atrasado", "expirado"];
    const { data: row } = await supabase
      .from("assinaturas")
      .select(
        "id, status, plano, plano_pretendido, ciclo_pretendido, asaas_checkout_id, asaas_checkout_created_at, asaas_subscription_id, asaas_customer_id, trial_ends_at, checkout_context, counted_payment_ids",
      )
      .eq("user_id", userId)
      .in("status", LIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return json(200, { reconciled: false, reason: "no_subscription" });
    if (row.status === "inadimplente" || row.status === "atrasado") {
      // Só o aviso do Asaas (pagamento da cobrança vencida) reativa cliente em atraso.
      console.log("reconcile: ignorado, cliente em atraso (só o webhook reativa)", JSON.stringify({ row: row.id, status: row.status }));
      return json(200, { reconciled: false, status: row.status, reason: "overdue_requires_webhook" });
    }
    if (row.status === "ativo") return json(200, { reconciled: false, status: "ativo" });
    const counted: string[] = Array.isArray(row.counted_payment_ids) ? row.counted_payment_ids as string[] : [];

    // Regra A: fonte primária é GET /payments?checkoutSession={id}. Não há
    // GET /checkouts/{id} no Asaas (404) e /subscriptions não filtra por
    // checkoutSession (devolve assinaturas antigas do cliente). Regra D: o
    // asaas_subscription_id só muda com cobrança deste checkout ou fallback único comprovado.
    let subscriptionId = "";
    let customerId = "";
    const checkoutStatus = "";
    let confirmedPaymentId: string | null = null;
    let lookupComplete = true;
    let fallbackAmbiguous = false;
    let ev: CheckoutEvaluation | null = null;
    if (row.asaas_checkout_id) {
      const ckId = row.asaas_checkout_id as string;
      const pays = await listAll(`/payments?checkoutSession=${encodeURIComponent(ckId)}`);
      lookupComplete = pays.complete;
      // O filtro do Asaas já restringe à sessão; marcamos explicitamente para
      // a regra A quando o campo não vier no item.
      const list: AsaasPayment[] = pays.items.map((p: AsaasPayment) => ({
        ...p, checkoutSession: p?.checkoutSession ?? ckId,
      }));
      ev = evaluateCheckoutPayments(ckId, row.asaas_checkout_created_at as string | null, lookupComplete ? list : []);
      if (ev.outcome === "activate") confirmedPaymentId = list.find((p) => ["CONFIRMED", "RECEIVED"].includes(p.status ?? "") && p.checkoutSession === ckId && onOrAfterCheckoutDay(paymentProofDay(p), row.asaas_checkout_created_at))?.id ?? null;
      subscriptionId = ev.subscriptionId ?? "";
      customerId = ev.customerId ?? "";

      // Fallback: cobranças de checkout RECORRENTE podem não trazer
      // checkoutSession. Só quando a consulta deu certo e veio vazia.
      if (lookupComplete && pays.items.length === 0) {
        const ctx = row.checkout_context as CheckoutContext | null;
        const requested = ctx?.requested ?? null;
        // Sem cliente conhecido, usa só externalReference para descobrir um cliente
        // e em seguida examina TODAS as assinaturas desse cliente compartilhado.
        let knownCustomer = row.asaas_customer_id as string | null;
        let discoveryComplete = true;
        if (!knownCustomer) {
          const refs = await listAll(`/subscriptions?externalReference=${encodeURIComponent(userId)}`);
          const customers = [...new Set(refs.items.filter((r) => r.externalReference === userId && typeof r.customer === "string").map((r) => r.customer as string))];
          discoveryComplete = refs.complete && customers.length <= 1;
          fallbackAmbiguous = customers.length > 1;
          if (refs.complete && customers.length === 1) knownCustomer = customers[0];
        }
        if (knownCustomer) {
          const subscriptions = await listAll(`/subscriptions?customer=${encodeURIComponent(knownCustomer)}`);
          lookupComplete = subscriptions.complete;
          const pick = subscriptions.complete
            ? selectFallbackSubscription(subscriptions.items.filter((r) => r.customer === knownCustomer), userId, row.asaas_checkout_created_at as string | null, requested)
            : { candidate: null, candidates: [], reason: "incomplete" };
          fallbackAmbiguous = pick.reason === "ambiguous";
          console.log("[reconcile-asaas] fallback assinaturas", JSON.stringify({ checkout: ckId, lidas: subscriptions.items.length, candidatos: pick.candidates, motivo: pick.reason }));
          if (pick.candidate?.id) {
            const charges = await listAll(`/payments?subscription=${encodeURIComponent(pick.candidate.id)}`);
            lookupComplete = charges.complete;
            if (charges.complete) {
              ev = evaluateSubscriptionPayments(pick.candidate.id, row.asaas_checkout_created_at as string | null, charges.items);
              subscriptionId = ev.outcome !== "none" ? ev.subscriptionId ?? "" : "";
              customerId = ev.outcome !== "none" ? knownCustomer : "";
              if (ev.outcome === "activate") confirmedPaymentId = charges.items.find((p) => ["CONFIRMED", "RECEIVED"].includes(p.status ?? "") && p.subscription === pick.candidate?.id && onOrAfterCheckoutDay(paymentProofDay(p), row.asaas_checkout_created_at))?.id ?? null;
            }
          }
        } else {
          // Sem vínculo para descobrir cliente: não adivinha por nome/email.
          lookupComplete = discoveryComplete;
          console.log("[reconcile-asaas] fallback assinaturas", JSON.stringify({ checkout: ckId, candidatos: [], motivo: "customer_not_proven" }));
        }
      }
    }

    const outcome = (ev as CheckoutEvaluation | null)?.outcome ?? "none";
    console.log("[reconcile-asaas] decisão", JSON.stringify({
      row: row.id,
      checkout: row.asaas_checkout_id ?? null,
      pagamentosPorCheckoutSession: ev?.linkedCount ?? 0,
      regra: ev?.rule ?? "C",
      outcome,
      diaCheckoutBRT: ev?.checkoutDay ?? null,
      checkoutCreatedAt: row.asaas_checkout_created_at ?? null,
      datasComparadas: ev?.comparedDays ?? [],
    }));

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

      if ((row.status === "pendente" || row.status === "trial" || row.status === "expirado") && tooOld && (ev?.linkedCount ?? 0) === 0 && lookupComplete && !fallbackAmbiguous && !(row.checkout_context as CheckoutContext | null)?.completed) {
        const restored = restoreCheckoutState({ ...row, checkout_context: row.checkout_context as CheckoutContext | null });
        const { error: restoreError } = await supabase.from("assinaturas").update({ ...restored, updated_at: new Date().toISOString() })
          .eq("id", row.id).eq("asaas_checkout_id", row.asaas_checkout_id).eq("status", row.status);
        if (restoreError) return json(500, { error: restoreError.message });
        console.log("[reconcile-asaas] checkout expirado, assinatura restaurada:", row.id);
        return json(200, { reconciled: false, expired: true, status: restored.status === "expirado" ? "trial_expirado" : restored.status, checkoutStatus });
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
          .eq("id", row.id).eq("asaas_checkout_id", row.asaas_checkout_id).eq("status", row.status);
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
        checkout_context: null,
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
      .eq("id", row.id).eq("asaas_checkout_id", row.asaas_checkout_id).eq("status", row.status);


    if (error) {
      console.error("[reconcile-asaas] update error:", error);
      return json(500, { error: error.message });
    }

    if (confirmedPaymentId) {
      const { error: countError } = await supabase.rpc("record_checkout_payment", { _assinatura_id: row.id, _payment_id: confirmedPaymentId });
      if (countError) return json(500, { error: countError.message });
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
