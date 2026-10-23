import { createClient } from "npm:@supabase/supabase-js@2";
import { asaasDay, onOrAfterCheckoutDay } from "../_shared/reconcile-decision.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { decideProration, findProrationInvoice, listProrationPayments } from "../_shared/proration.ts";
import { asaasApiKey, asaasBaseUrl, asaasKeyName } from "../_shared/asaas.ts";
import { decideCancelAccess } from "./cancel-access.ts";
import {
  belongsToOtherUser,
  cancelProviderSubscriptions,
  customerIdsForUser,
  isLiveSubscription,
  listAll,
  type AsaasSubscription,
} from "./provider-discovery.ts";

/** Única mensagem quando não dá para confirmar o cancelamento no Asaas. */
export const CANCEL_UNVERIFIED_MESSAGE =
  "Não conseguimos confirmar o cancelamento agora e, por isso, nada foi alterado. Tente de novo em instantes.";
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

const ASAAS_BASE_URL = asaasBaseUrl();

const PLANOS_VALIDOS = ["presenca", "influencia", "autoridade"];

type Plano = "presenca" | "influencia" | "autoridade";
type Action = "change_plan" | "cancel" | "update_card" | "list_invoices";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Trial vencido = data no passado. Sem data, não tratamos como vencido. */
const trialVencido = (trialEndsAt: string | null): boolean => {
  if (!trialEndsAt) return false;
  const ts = new Date(trialEndsAt).getTime();
  return !Number.isNaN(ts) && ts <= Date.now();
};

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
        "id, plano, status, asaas_subscription_id, asaas_subscription_id_anterior, asaas_customer_id, asaas_checkout_id, asaas_checkout_created_at, data_vencimento, trial_ends_at, ciclo_contratado, ciclos_pagos, counted_payment_ids, compromisso_inicio, compromisso_meses",
      )
      .eq("user_id", userId)
      .in("status", LIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!assinatura) {
      return json(404, { error: "Nenhuma assinatura encontrada para este usuário." });
    }

    const asaasKey = asaasApiKey();
    const asaasHeaders = {
      "Content-Type": "application/json",
      "access_token": asaasKey ?? "",
    };
    let subId = assinatura.asaas_subscription_id as string | null;

    const requireAsaas = () => {
      if (!asaasKey) throw new Error(`${asaasKeyName()} não configurada.`);
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
          billingType: "CREDIT_CARD",
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

    /** E-mail da conta: perfil e, na falta, o e-mail do token. */
    const accountEmail = async (): Promise<string | null> => {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("user_id", userId)
        .maybeSingle();
      const email = (prof?.email as string | null) ?? (claimsData.claims.email as string | undefined) ?? null;
      return email && email.trim() ? email.trim() : null;
    };

    /**
     * Auto-vínculo: quando o webhook falhou em gravar asaas_subscription_id, a
     * assinatura existe no Asaas mas a linha local está "órfã". Resolvemos na
     * hora pelos clientes do usuário, gravamos o id e seguimos.
     * O Asaas cria um cliente NOVO a cada checkout: se o cliente gravado não
     * trouxer assinatura viva, procuramos também em TODOS os clientes com o
     * e-mail da conta. (GET /checkouts/{id} não existe no Asaas; e
     * /payments?checkoutSession= devolve 0 para checkout de assinatura — não usamos.)
     * Retorna o id resolvido (ou null quando realmente não existe nada lá).
     */
    const resolveSubId = async (): Promise<string | null> => {
      if (subId) return subId;
      // Checkout com mais de 24h sem confirmação = tentativa abandonada. Não
      // serve de pista para localizar assinatura no provedor (e não deve
      // classificar a conta como "órfã"); o customer, sim, é dado estável.
      const CHECKOUT_TTL_MS = 24 * 60 * 60 * 1000;
      const checkoutCriadoMs = assinatura.asaas_checkout_created_at
        ? new Date(assinatura.asaas_checkout_created_at as string).getTime()
        : NaN;
      const checkoutAbandonado =
        !Number.isNaN(checkoutCriadoMs) && Date.now() - checkoutCriadoMs > CHECKOUT_TTL_MS;
      const checkoutId = checkoutAbandonado
        ? null
        : (assinatura.asaas_checkout_id as string | null);
      const storedCustomer = assinatura.asaas_customer_id as string | null;
      if (!checkoutId && !storedCustomer) return null;

      requireAsaas();

      // Regra D: só adota assinatura criada no mesmo dia ou depois do checkout
      // atual (dia em Brasília). Nunca adota assinatura removida, a removida
      // anteriormente nem a de outro usuário.
      const candidates: AsaasSubscription[] = [];
      const collect = async (customerIds: string[]) => {
        for (const customerId of customerIds) {
          try {
            const subs = await listAll(fetchAsaas, `/subscriptions?customer=${encodeURIComponent(customerId)}`);
            for (const s of subs as AsaasSubscription[]) {
              if (!s?.id || s.deleted === true || belongsToOtherUser(s, userId)) continue;
              if (s.id === assinatura.asaas_subscription_id_anterior) continue;
              if (!onOrAfterCheckoutDay(asaasDay(s?.dateCreated), assinatura.asaas_checkout_created_at as string | null)) continue;
              candidates.push({ ...s, customer: s.customer ?? customerId });
            }
          } catch (err) {
            console.error("resolveSubId subs error:", customerId, err instanceof Error ? err.message : String(err));
          }
        }
      };

      if (storedCustomer) await collect([storedCustomer]);
      if (!candidates.some(isLiveSubscription)) {
        const email = await accountEmail();
        if (email) {
          try {
            const all = await customerIdsForUser(fetchAsaas, null, email);
            await collect(all.filter((id) => id !== storedCustomer));
          } catch (err) {
            console.error("resolveSubId customer lookup error:", err instanceof Error ? err.message : String(err));
          }
        }
      }

      const pick = candidates.find(isLiveSubscription) ?? candidates[0] ?? null;
      if (!pick) {
        console.log("resolveSubId: nenhuma assinatura do usuário é posterior ao checkout", assinatura.asaas_checkout_created_at ?? null);
        return null;
      }
      subId = String(pick.id);

      const patch: Record<string, string> = { asaas_subscription_id: subId };
      // Cliente velho (de outro checkout) é substituído pelo dono da assinatura.
      if (pick.customer && pick.customer !== storedCustomer) patch.asaas_customer_id = String(pick.customer);
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
      // Agência: o valor é consolidado por marca (agency-manage-brand). Trocar
      // o plano da conta inteira aqui desalinharia a assinatura-mãe.
      const { data: prof } = await supabaseAdmin.from("profiles").select("account_type").eq("user_id", userId).maybeSingle();
      if (prof?.account_type === "agency") {
        return json(409, { error: "agencia_usa_faturamento_consolidado" });
      }
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

      // Ciclo: o enviado agora ou, na ausência, o já contratado.
      const ciclo = body.ciclo || body.billing_cycle
        ? normalizeCiclo(body.ciclo ?? body.billing_cycle)
        : normalizeCiclo(assinatura.ciclo_contratado);
      const cicloAtual = normalizeCiclo(assinatura.ciclo_contratado);
      const value = planValue(plano, ciclo);

      // Só é "nada a fazer" quando plano E ciclo são idênticos. Trocar apenas o
      // ciclo (ex.: Anual → Mensal no mesmo plano) é uma mudança real de preço.
      if (plano === assinatura.plano && ciclo === cicloAtual) {
        return json(200, { ok: true, success: true, mode: "noop", plano, ciclo });
      }

      console.log(
        "change_plan: rota decidida no servidor —",
        userId,
        "status:",
        assinatura.status,
        "vinculo:",
        !!assinatura.asaas_subscription_id,
        "plano solicitado:",
        plano,
        "ciclo solicitado:",
        ciclo,
      );

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
      let pendingPayments = [];
      let pendingLookupFailed = false;
      try { pendingPayments = await listProrationPayments(fetchAsaas, `/subscriptions/${subId}/payments?status=PENDING`); }
      catch { pendingLookupFailed = true; }

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
      const delta = value - oldValue;
      const decision = decideProration({ delta, nextDueDate: nextDue, pendingPayments, today: new Date(), cycleDays });
      const { daysLeft, currentCycleUnpaid: hasPending } = decision;
      const proRataValue = pendingLookupFailed ? 0 : decision.proRataValue;
      const reason = pendingLookupFailed ? "pending_lookup_failed" : decision.reason;
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
      let invoiceStatus = proRataValue >= 5 && !customerId ? "missing_customer" : "not_required";
      let referenceAttempt: number | null = null;
      if (shouldChargeProRata && customerId) {
        const existing = await findProrationInvoice(fetchAsaas, { externalReference: `prorata:${assinatura.id}:${plano}`, customerId, value: proRataValue });
        const externalReference = existing.externalReference;
        invoiceStatus = existing.status;
        referenceAttempt = existing.referenceAttempt;
        if (existing.status === "reused" && existing.payment) {
          proRata = { value: proRataValue, days: daysLeft, invoiceUrl: existing.payment.invoiceUrl ?? existing.payment.bankSlipUrl ?? null };
        } else if (existing.status === "clear") {
          try {
            const cobranca = await cobrarAvulsa({
              customerId,
              value: proRataValue,
              description:
                `Ivero — diferença proporcional do upgrade para ${plano} ` +
                `(${daysLeft} dia(s) restantes do ciclo atual)`,
              externalReference,
            });
            invoiceStatus = cobranca ? "created" : "failed";
            if (cobranca) proRata = { ...cobranca, days: daysLeft };
          } catch { invoiceStatus = "failed"; }
        }
      }

      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({ plano, ciclo_contratado: ciclo })
        .eq("id", assinatura.id);
      if (error) return json(500, { error: error.message });

      console.log("proration diagnostic:", JSON.stringify({ action, userId, plan: plano, oldValue, newValue: value, delta, nextDue, nextDueDate: nextDue, referenceDue: decision.referenceDue, referenceSource: decision.referenceSource, cycleDays, daysLeft, hasPending, pendingDueDates: pendingPayments.map((p) => p.dueDate ?? null), reason, prorata: proRata?.value ?? 0, proRataValue, invoiceStatus, referenceAttempt }));

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

      // Cancelamento FAIL-CLOSED: quem já registrou cartão/checkout só tem a
      // linha cancelada depois de confirmarmos que NENHUMA assinatura viva do
      // usuário continua no Asaas. Teste sem cartão (sem checkout, cliente nem
      // assinatura) cancela como antes, sem chamar o Asaas.
      let removedSubId: string | null = subId;
      const registeredWithProvider = !!(
        assinatura.asaas_subscription_id || assinatura.asaas_checkout_id || assinatura.asaas_customer_id
      );
      if (registeredWithProvider) {
        const unverified = (why: string) => {
          console.error("cancel não confirmado no Asaas, linha intacta:", userId, why);
          return json(502, { error: CANCEL_UNVERIFIED_MESSAGE, code: "cancel_unverified" });
        };
        if (!asaasKey) return unverified(`${asaasKeyName()} ausente`);
        const email = await accountEmail();
        let customerIds: string[];
        try {
          customerIds = await customerIdsForUser(fetchAsaas, assinatura.asaas_customer_id as string | null, email);
        } catch (err) {
          return unverified(`customers: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (!email && !customerIds.length && !subId) return unverified("sem e-mail, cliente ou assinatura para verificar");
        const outcome = await cancelProviderSubscriptions(fetchAsaas, {
          userId,
          knownSubscriptionId: subId,
          customerIds,
        });
        if (!outcome.ok) return unverified(outcome.reason);
        removedSubId = subId ?? outcome.deleted[0] ?? null;
        console.log("cancel: Asaas confirmado sem assinatura viva", userId, JSON.stringify({ customerIds, deleted: outcome.deleted }));
      }

      // Paga: acesso preservado até o fim do período já pago (data_vencimento
      // intacta). Teste grátis: acesso só até o fim do teste (ou agora, se não
      // houver data válida) — gravado em data_vencimento, que é o que o guarda
      // de acesso lê para assinaturas canceladas.
      // O vínculo com o Asaas é limpo (a assinatura lá deixou de existir), mas
      // guardamos o id anterior para auditoria/suporte.
      const access = decideCancelAccess({
        status: assinatura.status as string | null,
        trial_ends_at: assinatura.trial_ends_at as string | null,
        data_vencimento: assinatura.data_vencimento as string | null,
        ciclos_pagos: ciclosPagos,
        counted_payment_ids: assinatura.counted_payment_ids as string[] | null,
      });
      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({
          status: "cancelado",
          carencia_ate: null,
          asaas_subscription_id: null,
          asaas_subscription_id_anterior: removedSubId,
          ...(access.dataVencimento !== undefined ? { data_vencimento: access.dataVencimento } : {}),
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
        "isTrial:",
        access.isTrial,
        "accessUntil:",
        access.accessUntil,
        "motivo:",
        (body.motivo ?? "").slice(0, 200),
      );
      return json(200, {
        ok: true,
        success: true,
        // Mesmo valor de accessUntil (campo antigo, mantido por compatibilidade).
        acessoAte: access.accessUntil,
        accessUntil: access.accessUntil,
        isTrial: access.isTrial,
        endsNow: access.endsNow,
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
