import { createClient } from "npm:@supabase/supabase-js@2";
import { isBindEvent, matchWebhookRow } from "./matching.ts";
import { asaasApiKey, asaasBaseUrl } from "../_shared/asaas.ts";
import { overduePatch, resumeTrialPatch, subscriptionRemovalPatch } from "./subscription-lifecycle.ts";
import { restoreCheckoutState, type CheckoutContext } from "../_shared/checkout-state.ts";
import { promoteAgencyIntent } from "../_shared/agency-promote.ts";
import { handleUpgradePayment, parseUpgradeRef, UPGRADE_EVENTS } from "./upgrade-payment.ts";
import {
  asaasDay, decideWebhookEvent, isOneOffPayment, onOrAfterCheckoutDay, paymentProofDay, payloadKeys, type AsaasPayment,
} from "../_shared/reconcile-decision.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validate Asaas webhook token
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const receivedToken = req.headers.get("asaas-access-token");

    if (!expectedToken) {
      console.error("[asaas-webhook] ASAAS_WEBHOOK_TOKEN not configured");
      return json(500, { error: "Webhook token not configured" });
    }

    if (receivedToken !== expectedToken) {
      console.warn("[asaas-webhook] Invalid token received");
      return json(401, { error: "Unauthorized" });
    }

    // 2. Parse body
    const body = await req.json();
    const event: string = body?.event ?? "";
    console.log("[asaas-webhook] Event received:", event);

    // 3. Service role client (bypass RLS to update assinaturas)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const paymentSubId: string = body?.payment?.subscription ?? "";
    const paymentCustomerId: string = body?.payment?.customer ?? "";
    const subscriptionSubId: string = body?.subscription?.id ?? "";
    const subscriptionCustomerId: string = body?.subscription?.customer ?? "";
    // Eventos de Checkout Session (CHECKOUT_PAID etc.)
    const checkout = body?.checkout ?? {};
    // Pagamentos gerados por Checkout Session trazem `payment.checkoutSession`.
    const checkoutId: string = checkout?.id ?? body?.payment?.checkoutSession ?? body?.subscription?.checkoutSession ?? "";
    const checkoutSubId: string =
      (typeof checkout?.subscription === "string"
        ? checkout.subscription
        : checkout?.subscription?.id) ?? body?.subscription?.id ?? "";
    const checkoutCustomerId: string =
      (typeof checkout?.customer === "string" ? checkout.customer : checkout?.customer?.id) ?? "";
    // Com Checkout Session o vínculo com o usuário chega no externalReference
    // (gravado como user_id em create-checkout), porque a assinatura no Asaas
    // só existe depois que o cliente conclui o checkout.
    const externalReference: string =
      body?.payment?.externalReference ??
      body?.subscription?.externalReference ??
      checkout?.externalReference ??
      "";

    /**
     * Atualiza a assinatura do usuário.
     * 1º tenta pelo asaas_subscription_id (fluxo já vinculado);
     * se nada casar, cai pro externalReference (user_id) e aproveita para
     * gravar os IDs do Asaas — o "binding" acontece na confirmação do pagamento.
     */
    type MatchedRow = {
      id: string;
      status?: string | null;
      ciclo_contratado?: string | null;
      ciclos_pagos?: number | null;
      compromisso_inicio?: string | null;
      plano_pretendido?: string | null;
      ciclo_pretendido?: string | null;
      asaas_checkout_created_at?: string | null;
      asaas_subscription_id_anterior?: string | null;
      checkout_context?: CheckoutContext | null;
      carencia_ate?: string | null;
    };

    // Regra E: vínculo estrito. (1) asaas_subscription_id já gravado na linha;
    // (2) checkoutSession == asaas_checkout_id; (3) externalReference só se o
    // dia do evento (Brasília) for ≥ dia do checkout atual da linha; (4) só em
    // SUBSCRIPTION_CREATED/CHECKOUT_PAID: e-mail do cliente do Asaas == e-mail
    // da conta. Evento de assinatura antiga do mesmo cliente que não passa em
    // nenhuma é ignorado.
    const p = (body?.payment ?? {}) as AsaasPayment;
    const eventDay: string | null = body?.payment
      ? paymentProofDay(p)
      : asaasDay(body?.subscription?.dateCreated) ?? asaasDay(checkout?.dateCreated);
    const SELECT = "id, status, ciclo_contratado, ciclos_pagos, compromisso_inicio, plano_pretendido, ciclo_pretendido, asaas_checkout_created_at, asaas_subscription_id_anterior, checkout_context, carencia_ate";
    const USER_STATUSES = ["ativo", "trial", "pendente", "inadimplente", "atrasado", "expirado"];
    // Retomada de teste: a linha fica 'cancelado' durante a tela do Asaas, então
    // os eventos de vínculo também a enxergam (bindableByUser restringe o caso).
    const userStatuses = isBindEvent(event) ? [...USER_STATUSES, "cancelado"] : USER_STATUSES;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const bindCustomerId = event === "SUBSCRIPTION_CREATED" ? subscriptionCustomerId : event === "CHECKOUT_PAID" ? checkoutCustomerId : "";

    /**
     * Cliente do Asaas → conta pelo e-mail. Exige exatamente 1 perfil com esse
     * e-mail e, se o evento trouxer externalReference de OUTRO usuário, recusa.
     */
    const findRowByCustomerEmail = async (customerId: string): Promise<MatchedRow | null> => {
      const key = asaasApiKey();
      if (!key) { console.warn("[asaas-webhook] chave do Asaas ausente: vínculo por e-mail indisponível"); return null; }
      const res = await fetch(`${asaasBaseUrl()}/customers/${encodeURIComponent(customerId)}`, {
        headers: { "Content-Type": "application/json", access_token: key },
      });
      const text = await res.text();
      let cus: Record<string, unknown> | null = null;
      try { cus = text ? JSON.parse(text) : null; } catch { /* não-JSON */ }
      if (!res.ok) { console.error("[asaas-webhook] GET customer falhou:", res.status, customerId); return null; }
      const email = String(cus?.email ?? "").trim();
      if (!email) { console.warn("[asaas-webhook] cliente do Asaas sem e-mail:", customerId); return null; }
      const { data: profs, error: profError } = await supabase.from("profiles").select("user_id")
        .in("email", [...new Set([email, email.toLowerCase()])]).limit(2);
      if (profError) throw profError;
      if (!profs || profs.length !== 1) { console.warn("[asaas-webhook] e-mail do cliente não identifica uma única conta:", customerId, profs?.length ?? 0); return null; }
      const uid = String((profs[0] as { user_id: string }).user_id);
      if (UUID_RE.test(externalReference) && externalReference.toLowerCase() !== uid.toLowerCase()) {
        console.warn("[asaas-webhook] externalReference de outro usuário, vínculo por e-mail recusado:", customerId);
        return null;
      }
      const { data, error } = await supabase.from("assinaturas").select(SELECT).eq("user_id", uid)
        .in("status", userStatuses).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data as MatchedRow | null;
    };

    const findRow = (subscriptionId: string) =>
      matchWebhookRow(event, eventDay, !!body?.payment, subscriptionId, checkoutId, externalReference,
        async (path, id) => {
          if (path === "email") return findRowByCustomerEmail(id);
          let query = supabase.from("assinaturas").select(SELECT);
          if (path === "subscription") query = query.eq("asaas_subscription_id", id);
          if (path === "checkout") query = query.eq("asaas_checkout_id", id);
          if (path === "externalReference") query = query.eq("user_id", id).in("status", userStatuses).order("created_at", { ascending: false });
          const { data, error } = await query.limit(1).maybeSingle();
          if (error) throw error;
          return data as MatchedRow | null;
        }, bindCustomerId);

    const warnNoMatch = (subscriptionId: string) => console.warn(
      "[asaas-webhook] No assinatura matched for",
      event,
      JSON.stringify({ subscriptionId, externalReference }),
    );

    const updateAssinatura = async (
      subscriptionId: string,
      customerId: string,
      patch: Record<string, unknown> | ((row: MatchedRow) => Record<string, unknown>),
    ): Promise<{ ok?: boolean; matched?: string; row?: MatchedRow; error?: string; ignored?: boolean }> => {
      const now = new Date().toISOString();
      // Vínculo no 1º contato (CHECKOUT_PAID / SUBSCRIPTION_CREATED / pagamento):
      // grava os ids do Asaas que a linha ainda não tem. Eventos de remoção de
      // assinatura NÃO passam por aqui (ver SUBSCRIPTION_DELETED abaixo).
      const bindIds: Record<string, unknown> = {};
      if (subscriptionId) bindIds.asaas_subscription_id = subscriptionId;
      if (customerId) bindIds.asaas_customer_id = customerId;

      const apply = async (row: MatchedRow & { asaas_checkout_created_at?: string | null }, matched: string) => {
        const rowPatch = typeof patch === "function" ? patch(row) : patch;
        const { error } = await supabase
          .from("assinaturas")
          .update({ ...rowPatch, ...bindIds, ...(event === "CHECKOUT_PAID" ? { checkout_context: { ...row.checkout_context, completed: true } } : {}), updated_at: now })
          .eq("id", row.id);
        if (error) {
          console.error(`[asaas-webhook] DB update error (by ${matched}):`, error);
          return { error: error.message };
        }
        console.log("[asaas-webhook] regra E", matched, row.id, JSON.stringify({ eventDay, checkoutCreatedAt: row.asaas_checkout_created_at ?? null }));
        return { ok: true, matched, row };
      };

      const matched = await findRow(subscriptionId);
      if (matched) return apply(matched.row, matched.matched);

      warnNoMatch(subscriptionId);
      // Sem correspondência não é erro do nosso lado: responder 500 faz o
      // Asaas interromper a fila inteira de webhooks.
      return { ignored: true };
    };

    // P25a: diferença de upgrade individual ("prorata:<assinatura>:<plano>").
    // Agência (":agency:") e fidelidade não casam e seguem abaixo como antes.
    const upgradeRef = event.startsWith("PAYMENT_") && body?.payment ? parseUpgradeRef(p.externalReference) : null;
    if (upgradeRef) {
      if (UPGRADE_EVENTS.has(event)) {
        const r = await handleUpgradePayment(supabase, event, String(p.id ?? ""), upgradeRef);
        return json(r.status, r.body);
      }
      console.log("[asaas-webhook] cobrança de upgrade, evento ignorado:", event, p.id ?? "");
    }

    // Cobrança avulsa (sem assinatura e sem checkout: pró-rata, multa...):
    // nunca muda status, plano, ciclos_pagos nem promove marcas.
    if (event.startsWith("PAYMENT_") && body?.payment && isOneOffPayment(p)) {
      console.log("[asaas-webhook] cobrança avulsa reconhecida e ignorada:", event, p.id ?? "");
      return json(200, { received: true, ignored: "one_off" });
    }

    const isAvulsaPayment = /^(prorata|fidelidade):/.test(body?.payment?.externalReference ?? "");

    /**
     * Promove a INTENÇÃO gravada em create-checkout (plano_pretendido /
     * ciclo_pretendido) para o plano vigente. É aqui — e só aqui, no pagamento
     * confirmado — que a troca de plano vale de verdade. Checkout abandonado
     * nunca altera o plano do cliente.
     */
    const promoverIntencao = async (row: MatchedRow | undefined): Promise<MatchedRow | undefined> => {
      if (!row?.plano_pretendido) return row;
      const patch: Record<string, unknown> = {
        plano: row.plano_pretendido,
        plano_pretendido: null,
        ciclo_pretendido: null,
      };
      if (row.ciclo_pretendido) patch.ciclo_contratado = row.ciclo_pretendido;
      const { error } = await supabase.from("assinaturas").update(patch).eq("id", row.id);
      if (error) {
        console.error("[asaas-webhook] promover intenção error:", error);
        return row;
      }
      console.log("[asaas-webhook] plano promovido:", row.id, row.plano_pretendido);
      return {
        ...row,
        ciclo_contratado: row.ciclo_pretendido ?? row.ciclo_contratado,
        plano_pretendido: null,
        ciclo_pretendido: null,
      };
    };


    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + 30);
        const payExternalRef: string = body?.payment?.externalReference ?? "";
        const isAvulsa = /^(prorata|fidelidade):/.test(payExternalRef);

        // Mensalidade com id de pagamento: o Asaas envia CONFIRMED e, no
        // cartão, RECEIVED ~30 dias depois para o MESMO payment.id (e pode
        // reenviar qualquer um deles). Só o PRIMEIRO evento de cada payment.id
        // — seja CONFIRMED ou RECEIVED — conta o ciclo e muda o estado.
        // claim_subscription_payment decide e aplica tudo numa única instrução
        // (status, vencimento, carência, trial, checkout_context, plano
        // pretendido, vínculo dos ids e ciclos_pagos), guardada por
        // counted_payment_ids — seguro contra corrida e contra reenvio.
        if (!isAvulsa && p.id) {
          const found = await findRow(paymentSubId);
          if (!found) { warnNoMatch(paymentSubId); break; }
          const { data: claim, error: claimError } = await supabase.rpc("claim_subscription_payment", {
            _assinatura_id: found.row.id,
            _payment_id: p.id,
            _data_vencimento: nextDue.toISOString(),
            _asaas_subscription_id: paymentSubId || null,
            _asaas_customer_id: paymentCustomerId || null,
          });
          if (claimError) return json(500, { error: claimError.message });
          const result = claim as { ciclos_pagos: number | null; counted: boolean } | null;
          if (!result?.counted) {
            console.log("[asaas-webhook] pagamento já contabilizado, evento ignorado:", event, p.id);
            return json(200, { received: true, ignored: "already_counted" });
          }
          console.log("[asaas-webhook] regra E", found.matched, found.row.id, JSON.stringify({ eventDay, checkoutCreatedAt: found.row.asaas_checkout_created_at ?? null }));
          if (found.row.plano_pretendido) console.log("[asaas-webhook] plano promovido:", found.row.id, found.row.plano_pretendido);
          const { data: owner } = await supabase.from("assinaturas").select("user_id").eq("id", found.row.id).maybeSingle();
          if (owner?.user_id) await promoteAgencyIntent(supabase, owner.user_id as string, found.row.id);
          console.log("[asaas-webhook] ciclos_pagos =", result.ciclos_pagos, "assinatura:", found.row.id);
          break;
        }

        // Sem payment.id (não há como deduplicar) ou referência avulsa ligada a
        // uma assinatura: comportamento anterior, sem contar ciclo.
        const res = await updateAssinatura(paymentSubId, paymentCustomerId, {
          status: "ativo",
          carencia_ate: null,
          data_vencimento: nextDue.toISOString(),
          trial_ends_at: null,
          checkout_context: null,
        });
        if (res.error) return json(500, res);
        const promove = decideWebhookEvent(event, isAvulsa) === "activate";
        if (promove) res.row = await promoverIntencao(res.row);
        if (promove && res.row) {
          const { data: owner } = await supabase.from("assinaturas").select("user_id").eq("id", res.row.id).maybeSingle();
          if (owner?.user_id) await promoteAgencyIntent(supabase, owner.user_id as string, res.row.id);
        }
        break;
      }

      case "PAYMENT_OVERDUE": {
        // Cobrança avulsa vencida (pró-rata/multa) não afeta a mensalidade.
        if (isAvulsaPayment) { console.log("[asaas-webhook] avulsa overdue ignorada"); break; }
        // Tolerância de 3 dias contada do VENCIMENTO (fim do dia em Brasília);
        // reenvio não estende a carência já gravada.
        const dueDate: string | null = body?.payment?.dueDate ?? null;
        const res = await updateAssinatura(paymentSubId, paymentCustomerId, (row) => overduePatch(row, dueDate));
        if (res.error) return json(500, res);
        break;
      }

      case "PAYMENT_DELETED": {
        if (isAvulsaPayment) { console.log("[asaas-webhook] avulsa deleted ignorada"); break; }
        const res = await updateAssinatura(paymentSubId, paymentCustomerId, {
          status: "cancelado",
          carencia_ate: null,
        });
        if (res.error) return json(500, res);
        break;
      }

      case "CHECKOUT_PAID": {
        // Sessão concluída NÃO é pagamento confirmado (a 1ª cobrança pode estar
        // agendada para o fim do trial): só vincula os IDs do Asaas. Status,
        // planos pretendidos e marcas só mudam em PAYMENT_CONFIRMED/RECEIVED
        // (decideWebhookEvent → "link").
        // Log sanitizado: só CHAVES do payload e ids de checkout/assinatura.
        console.log("[asaas-webhook] CHECKOUT_PAID payload", JSON.stringify({
          keys: payloadKeys(body), checkoutId: checkoutId || null, subscriptionId: checkoutSubId || null,
        }));
        // Retomada de teste cancelado: cartão registrado → volta a 'trial' com
        // o mesmo trial_ends_at original (demais linhas: só vínculo, como antes).
        const res = await updateAssinatura(checkoutSubId, checkoutCustomerId, (row) => resumeTrialPatch(row));
        if (res.error) return json(500, res);
        break;
      }

      case "CHECKOUT_CANCELED":
      case "CHECKOUT_EXPIRED": {
        console.log("[asaas-webhook] Checkout não concluído:", event, checkoutId);
        if (checkoutId) {
          const { data: row, error: readError } = await supabase.from("assinaturas").select("*").eq("asaas_checkout_id", checkoutId).maybeSingle();
          if (readError) return json(500, { error: readError.message });
          // Um evento atrasado nunca desfaz pagamento nem checkout já concluído.
          if (row && row.status !== "ativo" && !(row.checkout_context as CheckoutContext | null)?.completed && !row.asaas_subscription_id) {
            const { error } = await supabase.from("assinaturas").update(restoreCheckoutState({ ...row, checkout_context: row.checkout_context as CheckoutContext | null }))
              .eq("id", row.id).eq("asaas_checkout_id", checkoutId).eq("status", row.status);
            if (error) return json(500, { error: error.message });
          }
        }
        break;
      }

      case "SUBSCRIPTION_CREATED": {
        // Vincula os IDs do Asaas assim que a assinatura nasce no checkout
        // (e, na retomada de teste cancelado, devolve a linha a 'trial').
        const res = await updateAssinatura(subscriptionSubId, subscriptionCustomerId, (row) => resumeTrialPatch(row));
        if (res.error) return json(500, res);
        break;
      }

      case "SUBSCRIPTION_UPDATED": {
        // Confirmação da troca de plano feita em manage-subscription (ou no
        // painel do Asaas): só reafirma o vínculo dos IDs.
        const res = await updateAssinatura(subscriptionSubId, subscriptionCustomerId, {});
        if (res.error) return json(500, res);
        break;
      }



      case "SUBSCRIPTION_DELETED":
      case "SUBSCRIPTION_INACTIVATED": {
        // Remoção NUNCA usa updateAssinatura: aquele caminho grava o id do
        // evento na linha (bindIds) e, depois que o cancelamento pelo app já
        // limpou o vínculo, casava por checkout/externalReference e regravava
        // o id da assinatura REMOVIDA. Aqui só a linha ainda vinculada
        // exatamente a esse id é tocada (ver subscriptionRemovalPatch).
        if (!subscriptionSubId) { console.log("[asaas-webhook] remoção sem subscription.id, ignorada:", event); break; }
        const { data: bound, error: readError } = await supabase.from("assinaturas")
          .select("id, status, asaas_subscription_id").eq("asaas_subscription_id", subscriptionSubId).limit(1).maybeSingle();
        if (readError) return json(500, { error: readError.message });
        const removal = subscriptionRemovalPatch(bound as { status: string | null; asaas_subscription_id: string | null } | null, subscriptionSubId);
        if (!removal || !bound) {
          console.log("[asaas-webhook] remoção de assinatura não vinculada, ignorada:", event, subscriptionSubId);
          break;
        }
        const { error } = await supabase.from("assinaturas")
          .update({ ...removal, updated_at: new Date().toISOString() })
          .eq("id", (bound as { id: string }).id).eq("asaas_subscription_id", subscriptionSubId);
        if (error) return json(500, { error: error.message });
        console.log("[asaas-webhook] assinatura removida desvinculada:", event, (bound as { id: string }).id, "status:", removal.status ?? (bound as { status: string | null }).status);
        break;
      }

      default:
        console.log("[asaas-webhook] Ignored event:", event);
    }

    return json(200, { received: true });
  } catch (err) {
    console.error("[asaas-webhook] Unexpected error:", err);
    return json(500, { error: (err as Error).message });
  }
});
