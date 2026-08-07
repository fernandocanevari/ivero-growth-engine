import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PLAN_ANNUAL_VALUES } from "../_shared/pricing.ts";

const ASAAS_BASE_URL = "https://sandbox.asaas.com/api/v3";

// Valores lidos do módulo compartilhado — fonte canônica: src/lib/pricing-rules.ts
const PLAN_VALUES: Record<string, number> = PLAN_ANNUAL_VALUES;

interface CheckoutBody {
  plano: "presenca" | "influencia" | "autoridade";
  nome: string;
  email: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("create-checkout started");
    // 1. Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // 2. Parse + validate body
    const body = (await req.json()) as CheckoutBody;
    const { plano, nome, email } = body || ({} as CheckoutBody);
    console.log("create-checkout body:", JSON.stringify({ plano, nome, email }));

    if (!plano || !PLAN_VALUES[plano]) {
      return new Response(
        JSON.stringify({ error: "Plano inválido. Use: presenca, influencia ou autoridade." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!nome || !email) {
      return new Response(
        JSON.stringify({ error: "nome e email são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Idempotência: se já existe assinatura viva, reaproveita em vez de criar outra.
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const LIVE_STATUSES = ["ativo", "trial", "inadimplente", "pendente"];
    const { data: existing } = await supabaseAdmin
      .from("assinaturas")
      .select("id, plano, status, asaas_subscription_id")
      .eq("user_id", userId)
      .in("status", LIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log("create-checkout: assinatura viva já existe", existing.id, existing.status);
      // Mesmo plano → devolve o checkout da cobrança pendente existente (se houver).
      let checkoutUrl = "";
      if (existing.asaas_subscription_id) {
        try {
          const res = await fetch(
            `${ASAAS_BASE_URL}/payments?subscription=${existing.asaas_subscription_id}&status=PENDING`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "access_token": Deno.env.get("ASAAS_API_KEY_SANDBOX")!,
              },
            },
          );
          const json = await res.json();
          checkoutUrl = json?.data?.[0]?.invoiceUrl ?? "";
        } catch (e) {
          console.error("create-checkout: erro ao buscar cobrança existente", e);
        }
      }
      return new Response(
        JSON.stringify({
          success: true,
          reused: true,
          assinaturaId: existing.id,
          plano: existing.plano,
          status: existing.status,
          checkoutUrl,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3c. Elegibilidade ao trial: só quem NUNCA teve histórico de assinatura
    // ganha os 7 dias grátis. Histórico com trial_ends_at no passado OU status
    // em expirado/cancelado/ativo/inadimplente = já usou (ou já foi cliente).
    const HISTORY_STATUSES = ["expirado", "trial_expirado", "cancelado", "ativo", "inadimplente"];
    const { data: history } = await supabaseAdmin
      .from("assinaturas")
      .select("id, status, trial_ends_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const nowMs = Date.now();
    let trialConcedido = true;
    for (const row of history ?? []) {
      const usedTrial =
        row.trial_ends_at !== null &&
        !Number.isNaN(new Date(row.trial_ends_at as string).getTime()) &&
        new Date(row.trial_ends_at as string).getTime() <= nowMs;
      if (usedTrial || HISTORY_STATUSES.includes(row.status ?? "")) {
        trialConcedido = false;
        break;
      }
    }
    console.log("create-checkout: trialConcedido =", trialConcedido);

    // 3b. Asaas credentials

    const asaasKey = Deno.env.get("ASAAS_API_KEY_SANDBOX");
    if (!asaasKey) {
      return new Response(
        JSON.stringify({ error: "ASAAS_API_KEY_SANDBOX não configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const asaasHeaders = {
      "Content-Type": "application/json",
      "access_token": Deno.env.get("ASAAS_API_KEY_SANDBOX")!,
    };


    // 4. Create customer
    const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({ name: nome, email }),
    });
    const customerJson = await customerRes.json();
    console.log("create-checkout asaas customer response:", JSON.stringify(customerJson));
    if (!customerRes.ok || !customerJson?.id) {
      console.error("create-checkout asaas customer error:", customerJson);
      const msg =
        customerJson?.errors?.[0]?.description ||
        customerJson?.message ||
        "Erro ao criar cliente no Asaas.";
      return new Response(JSON.stringify({ error: msg, details: customerJson }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const asaas_customer_id: string = customerJson.id;

    // 5. Create subscription — 7 dias grátis só para quem é elegível.
    // Não elegível → cobrança imediata (nextDueDate = hoje), sem trial.
    const today = new Date();
    const trialEndsAt = trialConcedido
      ? new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;
    const nextDueDate = (trialEndsAt ?? today).toISOString().slice(0, 10);
    const value = PLAN_VALUES[plano];
    // B. successUrl dinâmico: origin/Referer do request, fallback produção.
    const rawOrigin =
      req.headers.get("origin") ||
      (req.headers.get("referer")
        ? (() => {
            try {
              return new URL(req.headers.get("referer")!).origin;
            } catch {
              return "";
            }
          })()
        : "");
    // Asaas só aceita callback em domínio público https cadastrado na conta —
    // localhost/127.0.0.1/http são rejeitados, então caímos pra produção.
    const isPublicHttps =
      /^https:\/\//.test(rawOrigin) && !/localhost|127\.0\.0\.1/.test(rawOrigin);
    const baseUrl = isPublicHttps ? rawOrigin : "https://ivero.com.br";
    const successUrl = `${baseUrl.replace(/\/$/, "")}/bem-vindo?from=asaas`;

    console.log("create-checkout successUrl:", successUrl);

    const subRes = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({
        customer: asaas_customer_id,
        billingType: "CREDIT_CARD",
        cycle: "MONTHLY",
        value,
        nextDueDate,
        description: `Ivero — Plano ${plano}`,
      }),
    });
    const subJson = await subRes.json();
    console.log("create-checkout asaas subscription response:", JSON.stringify(subJson));
    if (!subRes.ok || !subJson?.id) {
      console.error("create-checkout asaas subscription error:", subJson);
      const msg =
        subJson?.errors?.[0]?.description ||
        subJson?.message ||
        "Erro ao criar assinatura no Asaas.";
      return new Response(JSON.stringify({ error: msg, details: subJson }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const asaas_subscription_id: string = subJson.id;

    // 5b. Fetch first payment (cobrança) generated for this subscription
    let checkoutUrl: string =
      subJson.invoiceUrl || subJson.bankSlipUrl || subJson.paymentLink || "";
    let firstPaymentId = "";
    try {
      const paymentsRes = await fetch(
        `${ASAAS_BASE_URL}/payments?subscription=${asaas_subscription_id}`,
        { method: "GET", headers: asaasHeaders },
      );
      const paymentsData = await paymentsRes.json();
      console.log("create-checkout payments response:", JSON.stringify(paymentsData));
      const firstPayment = paymentsData?.data?.[0];
      if (firstPayment?.invoiceUrl) {
        checkoutUrl = firstPayment.invoiceUrl;
      }
      firstPaymentId = firstPayment?.id ?? "";
    } catch (paymentsErr) {
      console.error("create-checkout payments fetch error:", paymentsErr);
    }

    // A. O redirect pós-pagamento vive no objeto `callback` do PAYMENT,
    // não na criação da subscription (a API ignora redirectUrl lá).
    if (firstPaymentId) {
      try {
        const cbRes = await fetch(`${ASAAS_BASE_URL}/payments/${firstPaymentId}`, {
          method: "PUT",
          headers: asaasHeaders,
          body: JSON.stringify({
            billingType: "CREDIT_CARD",
            value,
            dueDate: nextDueDate,
            callback: { successUrl, autoRedirect: true },
          }),
        });
        // Instrumentação: status + corpo cru ANTES de qualquer parse, senão um
        // corpo vazio derruba a leitura e perdemos o motivo real da falha.
        const cbText = await cbRes.text();
        console.log(
          "create-checkout callback update:",
          cbRes.status,
          cbRes.headers.get("content-type") ?? "",
          `len=${cbText.length}`,
          cbText.slice(0, 800),
        );
        let cbJson: { invoiceUrl?: string } | null = null;
        try {
          cbJson = cbText ? JSON.parse(cbText) : null;
        } catch (parseErr) {
          console.error("create-checkout callback update: corpo não-JSON", String(parseErr));
        }
        if (cbJson?.invoiceUrl) checkoutUrl = cbJson.invoiceUrl;

        // Prova objetiva: relê a cobrança e loga o estado real do callback.
        try {
          const verifyRes = await fetch(`${ASAAS_BASE_URL}/payments/${firstPaymentId}`, {
            method: "GET",
            headers: asaasHeaders,
          });
          const verifyText = await verifyRes.text();
          let verifyJson: Record<string, unknown> | null = null;
          try {
            verifyJson = verifyText ? JSON.parse(verifyText) : null;
          } catch { /* logado abaixo como texto cru */ }
          console.log(
            "create-checkout callback verify:",
            verifyRes.status,
            JSON.stringify(verifyJson?.callback ?? null),
            verifyJson ? "" : verifyText.slice(0, 400),
          );
        } catch (verifyErr) {
          console.error("create-checkout callback verify error:", String(verifyErr));
        }
      } catch (cbErr) {
        // D. Falha no callback não bloqueia o checkout: o usuário ainda paga e
        // o estado `pending` do /bem-vindo cobre métodos sem auto-redirect.
        console.error("create-checkout callback update error:", cbErr);
      }
    }


    if (!checkoutUrl) {
      checkoutUrl = `https://sandbox.asaas.com/i/${asaas_subscription_id}`;
    }


    // 6. Persist in assinaturas (service role to bypass RLS for insert)
    const dataInicio = new Date();
    const dataVencimento = new Date(dataInicio.getTime() + 30 * 24 * 60 * 60 * 1000);
    const novoStatus = trialConcedido ? "trial" : "pendente";

    const assinaturaPayload = {
      asaas_customer_id,
      asaas_subscription_id,
      plano,
      status: novoStatus,
      data_inicio: dataInicio.toISOString(),
      data_vencimento: dataVencimento.toISOString(),
      trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : null,
    };

    // D. Não acumular histórico: reaproveitamos a linha expirada mais recente
    // (update in place) e cancelamos as demais linhas mortas do usuário.
    const DEAD_STATUSES = ["expirado", "trial_expirado"];
    const linhaMorta = (history ?? []).find((r) => DEAD_STATUSES.includes(r.status ?? ""));

    let insertError: { code?: string; message: string } | null = null;

    if (linhaMorta) {
      const { error: updateError } = await supabaseAdmin
        .from("assinaturas")
        .update(assinaturaPayload)
        .eq("id", linhaMorta.id);
      insertError = updateError as typeof insertError;

      if (!updateError) {
        const outrasMortas = (history ?? [])
          .filter((r) => r.id !== linhaMorta.id && DEAD_STATUSES.includes(r.status ?? ""))
          .map((r) => r.id as string);
        if (outrasMortas.length > 0) {
          await supabaseAdmin
            .from("assinaturas")
            .update({ status: "cancelado" })
            .in("id", outrasMortas);
        }
      }
    } else {
      const { error } = await supabaseAdmin
        .from("assinaturas")
        .insert({ user_id: userId, ...assinaturaPayload });
      insertError = error as typeof insertError;
    }


    if (insertError) {
      // 23505 = unique_violation no índice parcial assinaturas_user_ativa_uniq:
      // uma assinatura viva foi criada em paralelo (duplo clique / corrida).
      // Tratamos como sucesso idempotente e atualizamos a linha existente.
      if ((insertError as { code?: string }).code === "23505") {
        console.log("create-checkout: corrida detectada (23505), reaproveitando assinatura viva");
        await supabaseAdmin
          .from("assinaturas")
          .update({
            asaas_customer_id,
            asaas_subscription_id,
            plano,
            trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : null,
          })
          .eq("user_id", userId)
          .in("status", LIVE_STATUSES);

        return new Response(
          JSON.stringify({ success: true, reused: true, trialConcedido, checkoutUrl }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.error("create-checkout insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Falha ao registrar assinatura.", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    // 7. Return checkout URL
    return new Response(JSON.stringify({ success: true, trialConcedido, checkoutUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("create-checkout error:", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Erro inesperado." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
