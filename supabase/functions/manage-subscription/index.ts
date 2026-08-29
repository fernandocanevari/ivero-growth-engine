import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PLAN_ANNUAL_VALUES } from "../_shared/pricing.ts";

/**
 * manage-subscription — gestão de assinatura JÁ existente.
 *
 * create-checkout continua sendo o único responsável por "primeira contratação".
 * Aqui tratamos as 4 ações do cliente que já tem linha em `assinaturas`:
 *   change_plan | cancel | update_card | list_invoices
 *
 * Regras de negócio importantes:
 *  - O Asaas NÃO faz rateio proporcional. Troca de valor vale só pras próximas
 *    cobranças (usamos updatePendingPayments: true pra pegar a pendente atual).
 *  - Cancelamento não corta acesso na hora: gravamos status='cancelado'
 *    preservando data_vencimento (fim do período já pago). O gate de acesso lê
 *    isso em src/lib/subscription-status.ts.
 *  - Nunca coletamos cartão no nosso front (escopo PCI). Para atualizar cartão
 *    devolvemos a URL hospedada pelo Asaas da cobrança pendente.
 */

const ASAAS_BASE_URL = "https://sandbox.asaas.com/api/v3";

const PLAN_VALUES: Record<string, number> = PLAN_ANNUAL_VALUES;

type Plano = "presenca" | "influencia" | "autoridade";
type Action = "change_plan" | "cancel" | "update_card" | "list_invoices";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Body {
  action?: Action;
  plano?: Plano;
  motivo?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json(401, { error: "Unauthorized" });
    const userId = claimsData.claims.sub as string;

    // 2. Body
    const body = (await req.json().catch(() => ({}))) as Body;
    const action = body.action;
    const VALID_ACTIONS: Action[] = ["change_plan", "cancel", "update_card", "list_invoices"];
    if (!action || !VALID_ACTIONS.includes(action)) {
      return json(400, { error: "action inválida. Use: " + VALID_ACTIONS.join(", ") });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 3. Assinatura viva do usuário
    const LIVE_STATUSES = ["ativo", "trial", "inadimplente", "atrasado", "pendente", "cancelado"];
    const { data: assinatura } = await supabaseAdmin
      .from("assinaturas")
      .select(
        "id, plano, status, asaas_subscription_id, asaas_customer_id, data_vencimento, trial_ends_at",
      )
      .eq("user_id", userId)
      .in("status", LIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!assinatura) {
      return json(404, { error: "Nenhuma assinatura encontrada para este usuário." });
    }

    const asaasKey = Deno.env.get("ASAAS_API_KEY_SANDBOX");
    const asaasHeaders = {
      "Content-Type": "application/json",
      "access_token": asaasKey ?? "",
    };
    const subId = assinatura.asaas_subscription_id as string | null;

    const requireAsaas = () => {
      if (!asaasKey) throw new Error("ASAAS_API_KEY_SANDBOX não configurada.");
    };

    const fetchAsaas = async (path: string, init: RequestInit = {}) => {
      const res = await fetch(`${ASAAS_BASE_URL}${path}`, { headers: asaasHeaders, ...init });
      const text = await res.text();
      let parsed: Record<string, any> | null = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch { /* corpo vazio / não-JSON */ }
      return { ok: res.ok, status: res.status, json: parsed, text };
    };

    // ---------------------------------------------------------------- ações

    if (action === "change_plan") {
      const plano = body.plano;
      if (!plano || !PLAN_VALUES[plano]) {
        return json(400, { error: "Plano inválido. Use: presenca, influencia ou autoridade." });
      }

      // Assinatura cancelada NÃO é troca de plano: é recontratação. Antes isso
      // caía no modo "local" silencioso e o cliente achava que tinha reativado
      // sem nunca passar por pagamento.
      if (assinatura.status === "cancelado") {
        return json(200, {
          ok: false,
          reason: "assinatura_cancelada",
          message:
            "Sua assinatura está cancelada. Para voltar a usar, é preciso contratar o plano novamente.",
        });
      }

      if (plano === assinatura.plano) {
        return json(200, { ok: true, success: true, mode: "noop", plano });
      }

      const value = PLAN_VALUES[plano];

      // Sem vínculo no Asaas (trial local ou pendente): troca só local. A
      // cobrança correta nasce depois, no create-checkout.
      if (!subId) {
        const { error } = await supabaseAdmin
          .from("assinaturas")
          .update({ plano })
          .eq("id", assinatura.id);
        if (error) return json(500, { error: error.message });
        console.log("change_plan local:", userId, plano);
        return json(200, { ok: true, success: true, mode: "local", plano });
      }


      requireAsaas();

      // 3.1 Estado atual da assinatura no Asaas (valor antigo, ciclo, vencimento
      // e customer — precisamos do customer pra emitir a cobrança avulsa).
      const cur = await fetchAsaas(`/subscriptions/${subId}`);
      if (!cur.ok) {
        console.error("change_plan get sub error:", cur.status, cur.text.slice(0, 500));
        return json(502, { error: "Não foi possível ler a assinatura no provedor de pagamentos." });
      }
      const oldValue = Number(cur.json?.value ?? 0);
      const cycle = String(cur.json?.cycle ?? "MONTHLY");
      const nextDue: string | null = cur.json?.nextDueDate ?? null;
      const customerId: string | null = cur.json?.customer ?? assinatura.asaas_customer_id ?? null;

      // 3.2 Há cobrança pendente do ciclo atual? Se sim, o próprio
      // updatePendingPayments corrige o valor dela — não existe diferença a
      // cobrar à parte (senão o cliente pagaria duas vezes pelo delta).
      const pend = await fetchAsaas(`/subscriptions/${subId}/payments?status=PENDING&limit=1`);
      const hasPending = Array.isArray(pend.json?.data) && pend.json!.data.length > 0;

      // 3.3 Diferença proporcional ao que resta do ciclo JÁ PAGO.
      const CYCLE_DAYS: Record<string, number> = {
        WEEKLY: 7,
        BIWEEKLY: 14,
        MONTHLY: 30,
        BIMONTHLY: 60,
        QUARTERLY: 90,
        SEMIANNUALLY: 182,
        YEARLY: 365,
      };
      const cycleDays = CYCLE_DAYS[cycle] ?? 30;
      const msDay = 86_400_000;
      const startOfToday = new Date(new Date().toISOString().slice(0, 10)).getTime();
      const dueTs = nextDue ? new Date(nextDue).getTime() : NaN;
      const daysLeft = Number.isNaN(dueTs)
        ? 0
        : Math.max(0, Math.min(cycleDays, Math.round((dueTs - startOfToday) / msDay)));

      const delta = value - oldValue;
      const isUpgrade = delta > 0;
      // Só cobramos quando: é upgrade, o ciclo atual está pago (sem pendente),
      // ainda sobra tempo de ciclo e o valor arredondado é cobrável no Asaas.
      const proRataRaw = isUpgrade && !hasPending ? (delta * daysLeft) / cycleDays : 0;
      const proRataValue = Math.round(proRataRaw * 100) / 100;
      const shouldChargeProRata = proRataValue >= 5 && !!customerId;

      // 3.4 Atualiza o valor da assinatura (vale pros ciclos futuros; com
      // updatePendingPayments ajusta também a pendente do ciclo corrente).
      const upd = await fetchAsaas(`/subscriptions/${subId}`, {
        method: "PUT",
        body: JSON.stringify({
          value,
          updatePendingPayments: true,
          description: `Ivero — Plano ${plano}`,
        }),
      });
      if (!upd.ok) {
        console.error("change_plan asaas error:", upd.status, upd.text.slice(0, 500));
        return json(502, {
          error:
            upd.json?.errors?.[0]?.description ||
            "Não foi possível atualizar o plano no provedor de pagamentos.",
        });
      }

      // 3.5 Cobrança avulsa da diferença proporcional (upgrade no meio do ciclo).
      // Falha aqui NÃO desfaz a troca de plano: o cliente já está no plano novo
      // e a diferença fica registrada no log para tratamento manual.
      let proRata: { value: number; days: number; invoiceUrl: string | null } | null = null;
      if (shouldChargeProRata) {
        const today = new Date().toISOString().slice(0, 10);
        const pay = await fetchAsaas(`/payments`, {
          method: "POST",
          body: JSON.stringify({
            customer: customerId,
            billingType: "UNDEFINED",
            value: proRataValue,
            dueDate: today,
            description:
              `Ivero — diferença proporcional do upgrade para ${plano} ` +
              `(${daysLeft} dia(s) restantes do ciclo atual)`,
            externalReference: `prorata:${assinatura.id}:${plano}`,
          }),
        });
        if (pay.ok) {
          proRata = {
            value: proRataValue,
            days: daysLeft,
            invoiceUrl: pay.json?.invoiceUrl ?? pay.json?.bankSlipUrl ?? null,
          };
        } else {
          console.error(
            "change_plan prorata error:",
            pay.status,
            pay.text.slice(0, 500),
            "value:",
            proRataValue,
          );
        }
      }

      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({ plano })
        .eq("id", assinatura.id);
      if (error) return json(500, { error: error.message });

      console.log(
        "change_plan asaas:",
        userId,
        plano,
        "oldValue:",
        oldValue,
        "newValue:",
        value,
        "daysLeft:",
        daysLeft,
        "hasPending:",
        hasPending,
        "proRata:",
        proRata?.value ?? 0,
      );

      return json(200, {
        ok: true,
        success: true,
        mode: "asaas",
        plano,
        value,
        previousValue: oldValue,
        nextDueDate: upd.json?.nextDueDate ?? null,
        proRata,
      });
    }

    if (action === "cancel") {
      if (subId) {
        requireAsaas();
        const del = await fetchAsaas(`/subscriptions/${subId}`, { method: "DELETE" });
        // 404 = já não existe no Asaas: seguimos com o cancelamento local.
        if (!del.ok && del.status !== 404) {
          console.error("cancel asaas error:", del.status, del.text.slice(0, 500));
          return json(502, {
            error:
              del.json?.errors?.[0]?.description ||
              "Não foi possível cancelar no provedor de pagamentos.",
          });
        }
      }

      // Acesso preservado até o fim do período já pago (data_vencimento intacta).
      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({ status: "cancelado", carencia_ate: null })
        .eq("id", assinatura.id);
      if (error) return json(500, { error: error.message });

      console.log("cancel:", userId, "motivo:", (body.motivo ?? "").slice(0, 200));
      return json(200, {
        success: true,
        acessoAte: assinatura.data_vencimento ?? assinatura.trial_ends_at ?? null,
      });
    }

    if (action === "update_card") {
      // Condições de negócio esperadas respondem HTTP 200 com ok:false — não
      // são erros de verdade, e o supabase.functions.invoke esconde o corpo de
      // respostas non-2xx.
      if (!subId) {
        return json(200, {
          ok: false,
          reason: "sem_assinatura_asaas",
          message: "Escolha um plano para cadastrar a forma de pagamento.",
        });
      }
      requireAsaas();
      // Página hospedada pelo Asaas da próxima cobrança: é lá que o cliente
      // troca o cartão sem que a gente toque em dado de cartão (PCI).
      const list = await fetchAsaas(`/subscriptions/${subId}/payments?status=PENDING&limit=1`);
      const url: string =
        list.json?.data?.[0]?.invoiceUrl || list.json?.data?.[0]?.bankSlipUrl || "";
      if (!url) {
        return json(200, {
          ok: false,
          reason: "sem_cobranca_pendente",
          message:
            "Não há cobrança pendente para atualizar o cartão agora. A troca ficará disponível na próxima cobrança.",
        });
      }
      return json(200, { ok: true, success: true, url });
    }

    // list_invoices
    if (!subId) {
      return json(200, { success: true, invoices: [], next: null });
    }
    requireAsaas();
    const list = await fetchAsaas(`/subscriptions/${subId}/payments?limit=50`);
    if (!list.ok) {
      console.error("list_invoices asaas error:", list.status, list.text.slice(0, 500));
      return json(502, { error: "Não foi possível carregar as faturas." });
    }
    const rows: any[] = Array.isArray(list.json?.data) ? list.json!.data : [];
    const invoices = rows.map((p) => ({
      id: p.id as string,
      dueDate: (p.paymentDate ?? p.dueDate ?? null) as string | null,
      value: Number(p.value ?? 0),
      status: String(p.status ?? ""),
      invoiceUrl: (p.invoiceUrl ?? null) as string | null,
      receiptUrl: (p.transactionReceiptUrl ?? null) as string | null,
      billingType: (p.billingType ?? null) as string | null,
    }));
    // Próxima cobrança = pendente com vencimento MAIS PRÓXIMO (a API devolve
    // em ordem decrescente, então não podemos usar o primeiro que aparecer).
    const next =
      invoices
        .filter((i) => i.status === "PENDING" || i.status === "AWAITING_RISK_ANALYSIS")
        .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0] ?? null;

    return json(200, { success: true, invoices, next });
  } catch (err) {
    console.error("manage-subscription error:", err instanceof Error ? err.message : String(err));
    return json(500, { error: (err as Error).message || "Erro inesperado." });
  }
});
