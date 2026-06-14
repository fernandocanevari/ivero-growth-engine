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

    // Helper to update by asaas_subscription_id
    const updateBySubscription = async (
      subscriptionId: string,
      patch: Record<string, unknown>,
    ) => {
      if (!subscriptionId) {
        console.error("[asaas-webhook] Missing subscription id for", event);
        return { error: "Missing subscription id" };
      }
      const { error } = await supabase
        .from("assinaturas")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("asaas_subscription_id", subscriptionId);
      if (error) {
        console.error("[asaas-webhook] DB update error:", error);
        return { error: error.message };
      }
      return { ok: true };
    };

    const paymentSubId: string = body?.payment?.subscription ?? "";
    const subscriptionSubId: string = body?.subscription?.id ?? "";

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + 30);
        const res = await updateBySubscription(paymentSubId, {
          status: "ativo",
          carencia_ate: null,
          data_vencimento: nextDue.toISOString(),
          trial_ends_at: null,
        });
        if (res.error) return json(500, res);
        break;
      }

      case "PAYMENT_OVERDUE": {
        const carencia = new Date();
        carencia.setDate(carencia.getDate() + 7);
        const res = await updateBySubscription(paymentSubId, {
          status: "atrasado",
          carencia_ate: carencia.toISOString(),
        });
        if (res.error) return json(500, res);
        break;
      }

      case "PAYMENT_DELETED": {
        const res = await updateBySubscription(paymentSubId, {
          status: "cancelado",
          carencia_ate: null,
        });
        if (res.error) return json(500, res);
        break;
      }

      case "SUBSCRIPTION_DELETED":
      case "SUBSCRIPTION_INACTIVATED": {
        const res = await updateBySubscription(subscriptionSubId, {
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
