import { createClient } from "npm:@supabase/supabase-js@2";

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
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const paymentSubId: string = body?.payment?.subscription ?? "";
    const paymentCustomerId: string = body?.payment?.customer ?? "";
    const subscriptionSubId: string = body?.subscription?.id ?? "";
    const subscriptionCustomerId: string = body?.subscription?.customer ?? "";
    // Eventos de Checkout Session (CHECKOUT_PAID etc.)
    const checkout = body?.checkout ?? {};
    const checkoutId: string = checkout?.id ?? "";
    const checkoutSubId: string =
      (typeof checkout?.subscription === "string"
        ? checkout.subscription
        : checkout?.subscription?.id) ?? "";
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
    };

    const updateAssinatura = async (
      subscriptionId: string,
      customerId: string,
      patch: Record<string, unknown>,
    ): Promise<{ ok?: boolean; matched?: string; row?: MatchedRow; error?: string }> => {
      const now = new Date().toISOString();
      const bindIds: Record<string, unknown> = {};
      if (subscriptionId) bindIds.asaas_subscription_id = subscriptionId;
      if (customerId) bindIds.asaas_customer_id = customerId;

      if (subscriptionId) {
        const { data, error } = await supabase
          .from("assinaturas")
          .update({ ...patch, ...bindIds, updated_at: now })
          .eq("asaas_subscription_id", subscriptionId)
          .select("id, ciclo_contratado, ciclos_pagos, compromisso_inicio, plano_pretendido, ciclo_pretendido");
        if (error) {
          console.error("[asaas-webhook] DB update error (by subscription):", error);
          return { error: error.message };
        }
        if (data && data.length > 0) return { ok: true, matched: "subscription", row: data[0] };
      }

      // Fallback por asaas_checkout_id (gravado em create-checkout).
      if (checkoutId) {
        const { data, error } = await supabase
          .from("assinaturas")
          .update({ ...patch, ...bindIds, updated_at: now })
          .eq("asaas_checkout_id", checkoutId)
          .select("id, ciclo_contratado, ciclos_pagos, compromisso_inicio, plano_pretendido, ciclo_pretendido");
        if (error) {
          console.error("[asaas-webhook] DB update error (by checkout):", error);
          return { error: error.message };
        }
        if (data && data.length > 0) return { ok: true, matched: "checkout", row: data[0] };
      }



      if (externalReference) {
        const LIVE_STATUSES = ["ativo", "trial", "pendente", "inadimplente", "atrasado"];
        const { data: row, error: selError } = await supabase
          .from("assinaturas")
          .select("id, ciclo_contratado, ciclos_pagos, compromisso_inicio, plano_pretendido, ciclo_pretendido")
          .eq("user_id", externalReference)
          .in("status", LIVE_STATUSES)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (selError) {
          console.error("[asaas-webhook] DB select error (by externalReference):", selError);
          return { error: selError.message };
        }
        if (row) {
          const { error } = await supabase
            .from("assinaturas")
            .update({ ...patch, ...bindIds, updated_at: now })
            .eq("id", row.id);
          if (error) {
            console.error("[asaas-webhook] DB update error (by externalReference):", error);
            return { error: error.message };
          }
          console.log("[asaas-webhook] matched via externalReference:", externalReference);
          return { ok: true, matched: "externalReference", row };
        }
      }

      console.error(
        "[asaas-webhook] No assinatura matched for",
        event,
        JSON.stringify({ subscriptionId, externalReference }),
      );
      return { error: "No matching assinatura" };
    };

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
        if (!isAvulsa) res.row = await promoverIntencao(res.row);
        if (event === "PAYMENT_CONFIRMED" && !isAvulsa && res.row) {
          const ciclos = (res.row.ciclos_pagos ?? 0) + 1;
          const inicio =
            res.row.compromisso_inicio ??
            (res.row.ciclo_contratado === "anual" ? new Date().toISOString() : null);
          const { error: incError } = await supabase
            .from("assinaturas")
            .update({ ciclos_pagos: ciclos, compromisso_inicio: inicio })
            .eq("id", res.row.id);
          if (incError) {
            console.error("[asaas-webhook] ciclos_pagos increment error:", incError);
          } else {
            console.log("[asaas-webhook] ciclos_pagos =", ciclos, "assinatura:", res.row.id);
          }
        }
        break;
      }

      case "PAYMENT_OVERDUE": {
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
        const res = await updateAssinatura(paymentSubId, paymentCustomerId, {
          status: "cancelado",
          carencia_ate: null,
        });
        if (res.error) return json(500, res);
        break;
      }

      case "CHECKOUT_PAID": {
        // Checkout Session concluída: libera acesso e vincula os IDs do Asaas.
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + 30);
        const res = await updateAssinatura(checkoutSubId, checkoutCustomerId, {
          status: "ativo",
          carencia_ate: null,
          data_vencimento: nextDue.toISOString(),
          trial_ends_at: null,
        });
        if (res.error) return json(500, res);
        await promoverIntencao(res.row);
        break;
      }

      case "CHECKOUT_CANCELED":
      case "CHECKOUT_EXPIRED": {
        console.log("[asaas-webhook] Checkout não concluído:", event, checkoutId);
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
