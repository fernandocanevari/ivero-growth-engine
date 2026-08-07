import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PLAN_ANNUAL_VALUES } from "../_shared/pricing.ts";

const ASAAS_BASE_URL = "https://sandbox.asaas.com/api/v3";

// Valores lidos do módulo compartilhado — fonte canônica: src/lib/pricing-rules.ts
const PLAN_VALUES: Record<string, number> = PLAN_ANNUAL_VALUES;

const PLAN_LABELS: Record<string, string> = {
  presenca: "Ivero — Plano Presença",
  influencia: "Ivero — Plano Influência",
  autoridade: "Ivero — Plano Autoridade",
};

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

    // 3. Idempotência: só reaproveita quando a assinatura já está vinculada ao
    // Asaas (asaas_subscription_id preenchido). Uma linha de trial local, sem
    // vínculo, NÃO bloqueia a criação da Checkout Session — é exatamente o caso
    // de quem está no trial e escolhe o plano para pagar.
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const LIVE_STATUSES = ["ativo", "trial", "inadimplente", "pendente"];
    const { data: existing } = await supabaseAdmin
      .from("assinaturas")
      .select("id, plano, status, asaas_subscription_id")
      .eq("user_id", userId)
      .in("status", LIVE_STATUSES)
      .not("asaas_subscription_id", "is", null)
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
    // Trial em curso: mantemos a data original — escolher o plano durante o
    // trial não estende o período grátis.
    let trialEmCursoMs: number | null = null;
    for (const row of history ?? []) {
      const trialMs = row.trial_ends_at
        ? new Date(row.trial_ends_at as string).getTime()
        : NaN;
      const trialValido = !Number.isNaN(trialMs);
      if (trialValido && trialMs > nowMs && trialEmCursoMs === null) {
        trialEmCursoMs = trialMs;
      }
      const usedTrial = trialValido && trialMs <= nowMs;
      if (usedTrial || HISTORY_STATUSES.includes(row.status ?? "")) {
        trialConcedido = false;
        break;
      }
    }
    console.log(
      "create-checkout: trialConcedido =",
      trialConcedido,
      "trialEmCurso =",
      trialEmCursoMs !== null,
    );


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
      "access_token": asaasKey,
    };

    // 4. Datas: elegível ao trial → primeira cobrança no fim do trial (data em
    // curso, se já houver, senão D+7). Não elegível → cobrança imediata (hoje),
    // sem trial_ends_at e sem nada que pareça trial.
    const today = new Date();
    const trialEndsAt = trialConcedido
      ? new Date(trialEmCursoMs ?? today.getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;
    const nextDueDate = (trialEndsAt ?? today).toISOString().slice(0, 10);
    const value = PLAN_VALUES[plano];

    // 5. URLs de callback. O Asaas só aceita domínio público https cadastrado
    // na conta — localhost/http são rejeitados, então caímos pra produção.
    // Também rejeita query string, por isso usamos rotas limpas que o app
    // redireciona internamente.
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
    const isPublicHttps =
      /^https:\/\//.test(rawOrigin) && !/localhost|127\.0\.0\.1/.test(rawOrigin);
    const baseUrl = (isPublicHttps ? rawOrigin : "https://ivero.com.br").replace(/\/$/, "");
    const successUrl = `${baseUrl}/retorno-asaas`;
    const cancelUrl = `${baseUrl}/retorno-asaas-cancelado`;
    const expiredUrl = `${baseUrl}/retorno-asaas-expirado`;
    console.log("create-checkout callback urls:", successUrl, cancelUrl, expiredUrl);

    // 6. Checkout Session (POST /checkouts).
    // Diferente do fluxo antigo (customer + subscription + PUT /payments com
    // callback, que o Asaas responde 500 com corpo vazio), aqui o `callback`
    // é aceito e o auto-redirect funciona. Não passamos `customer`: o Asaas
    // coleta nome/CPF/endereço na própria tela do checkout.
    const checkoutPayload: Record<string, unknown> = {
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 60,
      externalReference: userId,
      callback: { successUrl, cancelUrl, expiredUrl, autoRedirect: true },
      items: [
        {
          name: PLAN_LABELS[plano] ?? `Ivero — Plano ${plano}`,
          description: `Assinatura mensal — plano ${plano}`,
          quantity: 1,
          value,
        },
      ],
      subscription: {
        cycle: "MONTHLY",
        nextDueDate,
      },
    };

    const checkoutRes = await fetch(`${ASAAS_BASE_URL}/checkouts`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify(checkoutPayload),
    });

    // Leitura defensiva: o Asaas responde 500 com corpo VAZIO em alguns casos,
    // e um .json() direto derruba a função com "Unexpected end of JSON input".
    const checkoutText = await checkoutRes.text();
    let checkoutJson: Record<string, any> | null = null;
    try {
      checkoutJson = checkoutText ? JSON.parse(checkoutText) : null;
    } catch { /* tratado abaixo */ }
    console.log(
      "create-checkout asaas checkout response:",
      checkoutRes.status,
      checkoutText.slice(0, 800),
    );

    const checkoutUrl: string = checkoutJson?.link || checkoutJson?.url || "";
    if (!checkoutRes.ok || !checkoutUrl) {
      console.error("create-checkout asaas checkout error:", checkoutRes.status, checkoutText);
      const msg =
        checkoutJson?.errors?.[0]?.description ||
        checkoutJson?.message ||
        "Erro ao criar checkout no Asaas.";
      return new Response(
        JSON.stringify({ error: msg, details: checkoutJson ?? checkoutText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const asaasCheckoutId: string = checkoutJson?.id ?? "";

    // 7. Persist in assinaturas (service role to bypass RLS for insert).
    // asaas_customer_id / asaas_subscription_id ficam nulos aqui: a assinatura
    // no Asaas só passa a existir depois que o cliente conclui o checkout, e o
    // asaas-webhook grava esses IDs na confirmação do pagamento.
    const dataInicio = new Date();
    const dataVencimento = new Date(dataInicio.getTime() + 30 * 24 * 60 * 60 * 1000);
    const novoStatus = trialConcedido ? "trial" : "pendente";

    const assinaturaPayload = {
      asaas_customer_id: null,
      asaas_subscription_id: null,
      plano,
      status: novoStatus,
      data_inicio: dataInicio.toISOString(),
      data_vencimento: dataVencimento.toISOString(),
      trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : null,
    };

    // Não acumular histórico: reaproveitamos a linha viva sem vínculo com o
    // Asaas (trial/pendente local) ou, na falta dela, a linha expirada mais
    // recente — sempre update in place — e cancelamos as demais linhas mortas.
    const DEAD_STATUSES = ["expirado", "trial_expirado"];
    const linhaViva = (history ?? []).find((r) => LIVE_STATUSES.includes(r.status ?? ""));
    const linhaMorta =
      linhaViva ?? (history ?? []).find((r) => DEAD_STATUSES.includes(r.status ?? ""));

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
            plano,
            trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : null,
          })
          .eq("user_id", userId)
          .in("status", LIVE_STATUSES);

        return new Response(
          JSON.stringify({
            success: true,
            reused: true,
            trialConcedido,
            checkoutUrl,
            asaasCheckoutId,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.error("create-checkout insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Falha ao registrar assinatura.", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 8. Return checkout URL
    return new Response(
      JSON.stringify({ success: true, trialConcedido, checkoutUrl, asaasCheckoutId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-checkout error:", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Erro inesperado." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
