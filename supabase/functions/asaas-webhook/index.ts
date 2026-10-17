import { createClient } from "npm:@supabase/supabase-js@2";
import { matchWebhookRow } from "./matching.ts";
import { restoreCheckoutState, type CheckoutContext } from "../_shared/checkout-state.ts";
import { promoteAgencyIntent } from "../_shared/agency-promote.ts";
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
      ciclo_contratado?: string | null;
      ciclos_pagos?: number | null;
      compromisso_inicio?: string | null;
      plano_pretendido?: string | null;
      ciclo_pretendido?: string | null;
      asaas_checkout_created_at?: string | null;
      checkout_context?: CheckoutContext | null;
    };

    // Regra E: vínculo estrito. (1) asaas_subscription_id já gravado na linha;
    // (2) checkoutSession == asaas_checkout_id; (3) externalReference só se o
    // dia do evento (Brasília) for ≥ dia do checkout atual da linha. Evento de
    // assinatura antiga do mesmo cliente que não passa em nenhuma é ignorado.
    const p = (body?.payment ?? {}) as AsaasPayment;
    const eventDay: string | null = body?.payment
      ? paymentProofDay(p)
      : asaasDay(body?.subscription?.dateCreated) ?? asaasDay(checkout?.dateCreated);
    const SELECT = "id, ciclo_contratado, ciclos_pagos, compromisso_inicio, plano_pretendido, ciclo_pretendido, asaas_checkout_created_at, checkout_context";

    const updateAssinatura = async (
      subscriptionId: string,
      customerId: string,
      patch: Record<string, unknown>,
    ): Promise<{ ok?: boolean; matched?: string; row?: MatchedRow; error?: string; ignored?: boolean }> => {
      const now = new Date().toISOString();
      const bindIds: Record<string, unknown> = {};
      if (subscriptionId) bindIds.asaas_subscription_id = subscriptionId;
      if (customerId) bindIds.asaas_customer_id = customerId;

      const apply = async (row: MatchedRow & { asaas_checkout_created_at?: string | null }, matched: string) => {
        const { error } = await supabase
          .from("assinaturas")
          .update({ ...patch, ...bindIds, ...(event === "CHECKOUT_PAID" ? { checkout_context: { ...row.checkout_context, completed: true } } : {}), updated_at: now })
          .eq("id", row.id);
        if (error) {
          console.error(`[asaas-webhook] DB update error (by ${matched}):`, error);
          return { error: error.message };
        }
        console.log("[asaas-webhook] regra E", matched, row.id, JSON.stringify({ eventDay, checkoutCreatedAt: row.asaas_checkout_created_at ?? null }));
        return { ok: true, matched, row };
      };

      const matched = await matchWebhookRow(event, eventDay, !!body?.payment, subscriptionId, checkoutId, externalReference,
        async (path, id) => {
          let query = supabase.from("assinaturas").select(SELECT);
          if (path === "subscription") query = query.eq("asaas_subscription_id", id);
          if (path === "checkout") query = query.eq("asaas_checkout_id", id);
          if (path === "externalReference") query = query.eq("user_id", id).in("status", ["ativo", "trial", "pendente", "inadimplente", "atrasado", "expirado"]).order("created_at", { ascending: false });
          const { data, error } = await query.limit(1).maybeSingle();
          if (error) throw error;
          return data;
        });
      if (matched) return apply(matched.row, matched.matched);

      console.warn(
        "[asaas-webhook] No assinatura matched for",
        event,
        JSON.stringify({ subscriptionId, externalReference }),
      );
      // Sem correspondência não é erro do nosso lado: responder 500 faz o
      // Asaas interromper a fila inteira de webhooks.
      return { ignored: true };
    };

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
        const res = await updateAssinatura(paymentSubId, paymentCustomerId, {
          status: "ativo",
          carencia_ate: null,
          data_vencimento: nextDue.toISOString(),
          trial_ends_at: null,
          checkout_context: null,
        });
        if (res.error) return json(500, res);

        // Contagem de mensalidades efetivamente pagas — base do cálculo da
        // multa de fidelidade no cancelamento do ciclo anual.
        // Só contamos em PAYMENT_CONFIRMED (o Asaas dispara CONFIRMED e depois
        // RECEIVED para o mesmo pagamento) e ignoramos cobranças avulsas
        // (pró-rata do upgrade / multa de fidelidade), que não são mensalidade.
        const payExternalRef: string = body?.payment?.externalReference ?? "";
        const isAvulsa = /^(prorata|fidelidade):/.test(payExternalRef);
        // Pagamento de mensalidade confirmado → promove o plano pretendido.
        const promove = decideWebhookEvent(event, isAvulsa) === "activate";
        if (promove) res.row = await promoverIntencao(res.row);
        if (promove && res.row) {
          const { data: owner } = await supabase.from("assinaturas").select("user_id").eq("id", res.row.id).maybeSingle();
          if (owner?.user_id) await promoteAgencyIntent(supabase, owner.user_id as string, res.row.id);
        }
        if (!isAvulsa && res.row && p.id) {
          const { data: ciclos, error: incError } = await supabase.rpc("record_checkout_payment", { _assinatura_id: res.row.id, _payment_id: p.id });
          if (incError) return json(500, { error: incError.message });
          console.log("[asaas-webhook] ciclos_pagos =", ciclos, "assinatura:", res.row.id);
        }
        break;
      }

      case "PAYMENT_OVERDUE": {
        // Cobrança avulsa vencida (pró-rata/multa) não afeta a mensalidade.
        if (isAvulsaPayment) { console.log("[asaas-webhook] avulsa overdue ignorada"); break; }
        const carencia = new Date();
        carencia.setDate(carencia.getDate() + 7);
        const res = await updateAssinatura(paymentSubId, paymentCustomerId, {
          status: "atrasado",
          carencia_ate: carencia.toISOString(),
        });
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
        const res = await updateAssinatura(checkoutSubId, checkoutCustomerId, {});
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
        // Vincula os IDs do Asaas assim que a assinatura nasce no checkout.
        const res = await updateAssinatura(subscriptionSubId, subscriptionCustomerId, {});
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
        const res = await updateAssinatura(subscriptionSubId, subscriptionCustomerId, {
          status: "cancelado",
          carencia_ate: null,
        });
        if (res.error) return json(500, res);
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
