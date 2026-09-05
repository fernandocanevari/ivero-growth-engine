import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  normalizeCiclo,
  planValue,
  multaFidelidade,
  COMPROMISSO_MESES,
} from "../_shared/pricing.ts";

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

const PLANOS_VALIDOS = ["presenca", "influencia", "autoridade"];

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
  /** Ciclo escolhido pelo cliente. Ausente = ciclo já contratado. */
  ciclo?: "mensal" | "anual";
  /** Legado do UpgradeModal. */
  billing_cycle?: string;
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
        "id, plano, status, asaas_subscription_id, asaas_customer_id, asaas_checkout_id, data_vencimento, trial_ends_at, ciclo_contratado, ciclos_pagos, compromisso_inicio, compromisso_meses",
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
    let subId = assinatura.asaas_subscription_id as string | null;

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

    /**
     * Cobrança avulsa (PAYMENT único) no Asaas. Usada tanto pela diferença
     * proporcional do upgrade quanto pela multa de fidelidade do ciclo anual.
     * Nunca lança: em falha, loga e devolve null (a operação principal segue).
     */
    const cobrarAvulsa = async (args: {
      customerId: string;
      value: number;
      description: string;
      externalReference: string;
    }): Promise<{ value: number; invoiceUrl: string | null } | null> => {
      const today = new Date().toISOString().slice(0, 10);
      const pay = await fetchAsaas(`/payments`, {
        method: "POST",
        body: JSON.stringify({
          customer: args.customerId,
          billingType: "UNDEFINED",
          value: args.value,
          dueDate: today,
          description: args.description,
          externalReference: args.externalReference,
        }),
      });
      if (!pay.ok) {
        console.error(
          "cobrarAvulsa error:",
          pay.status,
          pay.text.slice(0, 500),
          "value:",
          args.value,
          "ref:",
          args.externalReference,
        );
        return null;
      }
      return {
        value: args.value,
        invoiceUrl: pay.json?.invoiceUrl ?? pay.json?.bankSlipUrl ?? null,
      };
    };

    /**
     * Auto-vínculo: quando o webhook falhou em gravar asaas_subscription_id, a
     * assinatura existe no Asaas mas a linha local está "órfã". Resolvemos na
     * hora pelo checkout ou pelo customer, gravamos o id e seguimos.
     * Retorna o id resolvido (ou null quando realmente não existe nada lá).
     */
    const resolveSubId = async (): Promise<string | null> => {
      if (subId) return subId;
      const checkoutId = assinatura.asaas_checkout_id as string | null;
      let customerId = assinatura.asaas_customer_id as string | null;
      if (!checkoutId && !customerId) return null;

      requireAsaas();

      // 1) Pelo checkout: traz subscription e/ou customer. Sessões antigas
      // podem já não existir mais no Asaas (404) — segue pro passo 2.
      if (checkoutId) {
        const co = await fetchAsaas(`/checkouts/${checkoutId}`);
        if (co.ok && co.json) {
          const fromCheckout =
            (co.json.subscription?.id ?? co.json.subscription ?? null) as string | null;
          if (typeof fromCheckout === "string" && fromCheckout.startsWith("sub_")) {
            subId = fromCheckout;
          }
          const coCustomer = (co.json.customer?.id ?? co.json.customer ?? null) as string | null;
          if (!customerId && typeof coCustomer === "string") customerId = coCustomer;
        } else {
          console.error("resolveSubId checkout error:", co.status, co.text.slice(0, 300));
        }
      }

      // 2) Sem customer gravado: localiza pelo e-mail da conta.
      if (!subId && !customerId) {
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("user_id", userId)
          .maybeSingle();
        const email = (prof?.email as string | null) ?? null;
        if (email) {
          const cus = await fetchAsaas(`/customers?email=${encodeURIComponent(email)}&limit=10`);
          const found = Array.isArray(cus.json?.data) ? cus.json!.data[0] : null;
          if (found?.id) customerId = String(found.id);
          else console.error("resolveSubId customer lookup vazio:", cus.status);
        }
      }

      // 3) Pelo customer: assinatura ativa mais recente.
      if (!subId && customerId) {
        const subs = await fetchAsaas(`/subscriptions?customer=${customerId}&limit=10`);
        if (subs.ok && Array.isArray(subs.json?.data)) {
          const rows = subs.json!.data as any[];
          const pick =
            rows.find((s) => String(s.status ?? "").toUpperCase() === "ACTIVE") ?? rows[0] ?? null;
          if (pick?.id) subId = String(pick.id);
        } else if (!subs.ok) {
          console.error("resolveSubId subs error:", subs.status, subs.text.slice(0, 300));
        }
      }


      if (!subId) return null;

      const patch: Record<string, string> = { asaas_subscription_id: subId };
      if (customerId && !assinatura.asaas_customer_id) patch.asaas_customer_id = customerId;
      const { error: bindError } = await supabaseAdmin
        .from("assinaturas")
        .update(patch)
        .eq("id", assinatura.id);
      if (bindError) console.error("resolveSubId bind error:", bindError.message);
      console.log("resolveSubId bound:", userId, subId);
      return subId;
    };

    // ---------------------------------------------------------------- ações


    if (action === "change_plan") {
      const plano = body.plano;
      if (!plano || !PLANOS_VALIDOS.includes(plano)) {
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

      // Ciclo: o enviado agora ou, na ausência, o já contratado.
      const ciclo = body.ciclo || body.billing_cycle
        ? normalizeCiclo(body.ciclo ?? body.billing_cycle)
        : normalizeCiclo(assinatura.ciclo_contratado);
      const value = planValue(plano, ciclo);

      // Sem vínculo no Asaas (trial local ou pendente): troca só local. A
      // cobrança correta nasce depois, no create-checkout. Antes tentamos o
      // auto-vínculo — a linha pode estar órfã por falha de webhook.
      if (!(await resolveSubId())) {
        const { error } = await supabaseAdmin
          .from("assinaturas")
          .update({ plano, ciclo_contratado: ciclo })
          .eq("id", assinatura.id);
        if (error) return json(500, { error: error.message });
        console.log("change_plan local:", userId, plano, ciclo);
        return json(200, { ok: true, success: true, mode: "local", plano, ciclo });
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
        const cobranca = await cobrarAvulsa({
          customerId: customerId!,
          value: proRataValue,
          description:
            `Ivero — diferença proporcional do upgrade para ${plano} ` +
            `(${daysLeft} dia(s) restantes do ciclo atual)`,
          externalReference: `prorata:${assinatura.id}:${plano}`,
        });
        if (cobranca) proRata = { ...cobranca, days: daysLeft };
      }

      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({ plano, ciclo_contratado: ciclo })
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
        ciclo,
        value,
        previousValue: oldValue,
        nextDueDate: upd.json?.nextDueDate ?? null,
        proRata,
      });
    }

    if (action === "cancel") {
      // Compromisso anual: cancelar antes de completar os 12 ciclos gera
      // cobrança avulsa da diferença (valor cheio - promocional) x meses já
      // usufruídos com desconto. Base primária = mensalidades confirmadas;
      // a data de início do compromisso serve de sanidade (nunca conta mais
      // meses do que os decorridos).
      const cicloContratado = normalizeCiclo(assinatura.ciclo_contratado);
      const ciclosPagos = Number(assinatura.ciclos_pagos ?? 0);
      const compromissoMeses = Number(assinatura.compromisso_meses ?? COMPROMISSO_MESES);
      let mesesDecorridos = ciclosPagos;
      if (assinatura.compromisso_inicio) {
        const inicioTs = new Date(assinatura.compromisso_inicio as string).getTime();
        if (!Number.isNaN(inicioTs)) {
          const dias = Math.max(0, (Date.now() - inicioTs) / 86_400_000);
          mesesDecorridos = Math.min(ciclosPagos, Math.floor(dias / 30) + 1);
        }
      }
      const ciclosComDesconto =
        cicloContratado === "anual" && ciclosPagos > 0 && ciclosPagos < compromissoMeses
          ? Math.max(0, mesesDecorridos)
          : 0;
      const multaValue = ciclosComDesconto > 0
        ? multaFidelidade(assinatura.plano as string, ciclosComDesconto)
        : 0;

      if (await resolveSubId()) {
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
      // O vínculo com o Asaas é limpo (a assinatura lá deixou de existir), mas
      // guardamos o id anterior para auditoria/suporte.
      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({
          status: "cancelado",
          carencia_ate: null,
          asaas_subscription_id: null,
          asaas_subscription_id_anterior: subId ?? null,
        })
        .eq("id", assinatura.id);
      if (error) return json(500, { error: error.message });

      // Multa de fidelidade — emitida DEPOIS do cancelamento efetivo: falha
      // aqui não impede o cliente de cancelar (mesma política do pró-rata).
      let multa: { value: number; ciclos: number; invoiceUrl: string | null } | null = null;
      const customerParaMulta = assinatura.asaas_customer_id as string | null;
      if (multaValue >= 5 && customerParaMulta && asaasKey) {
        const cobranca = await cobrarAvulsa({
          customerId: customerParaMulta,
          value: multaValue,
          description:
            `Ivero — diferença de fidelidade (plano ${assinatura.plano}, ` +
            `${ciclosComDesconto} mês(es) com desconto anual)`,
          externalReference: `fidelidade:${assinatura.id}:${assinatura.plano}`,
        });
        if (cobranca) multa = { ...cobranca, ciclos: ciclosComDesconto };
      } else if (multaValue > 0) {
        console.error(
          "cancel: multa de fidelidade não emitida (sem customer/chave):",
          userId,
          multaValue,
        );
      }

      console.log(
        "cancel:",
        userId,
        "ciclo:",
        cicloContratado,
        "ciclosPagos:",
        ciclosPagos,
        "multa:",
        multa?.value ?? 0,
        "motivo:",
        (body.motivo ?? "").slice(0, 200),
      );
      return json(200, {
        ok: true,
        success: true,
        acessoAte: assinatura.data_vencimento ?? assinatura.trial_ends_at ?? null,
        ciclo: cicloContratado,
        ciclosPagos,
        multa,
      });

    }

    if (action === "update_card") {
      // Condições de negócio esperadas respondem HTTP 200 com ok:false — não
      // são erros de verdade, e o supabase.functions.invoke esconde o corpo de
      // respostas non-2xx.
      const resolved = await resolveSubId();
      if (!resolved) {
        // Trial em curso nunca tem cobrança no provedor — mesmo que exista um
        // asaas_checkout_id de uma tentativa abandonada. Esse caso não é
        // "órfã": é simplesmente período de teste, e a copy tem que dizer isso.
        const trialSemCobranca =
          assinatura.status === "trial" &&
          !assinatura.asaas_subscription_id &&
          !trialVencido(assinatura.trial_ends_at as string | null);
        if (trialSemCobranca) {
          return json(200, {
            ok: false,
            reason: "trial_sem_cobranca",
            message:
              "Você ainda está no período de teste — a forma de pagamento será solicitada quando o trial terminar.",
          });
        }
        const orfa = !!(assinatura.asaas_checkout_id || assinatura.asaas_customer_id);
        return json(200, {
          ok: false,
          reason: orfa ? "assinatura_nao_localizada" : "sem_assinatura_asaas",
          message: orfa
            ? "Não localizamos sua assinatura no provedor de pagamentos. Fale com o suporte."
            : "Escolha um plano para cadastrar a forma de pagamento.",
        });
      }
      requireAsaas();
      // Página hospedada pelo Asaas da próxima cobrança: é lá que o cliente
      // troca o cartão sem que a gente toque em dado de cartão (PCI).
      const list = await fetchAsaas(`/subscriptions/${resolved}/payments?status=PENDING&limit=1`);
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
    const resolvedForList = await resolveSubId();
    if (!resolvedForList) {
      return json(200, { success: true, invoices: [], next: null });
    }
    requireAsaas();
    const list = await fetchAsaas(`/subscriptions/${resolvedForList}/payments?limit=50`);
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
