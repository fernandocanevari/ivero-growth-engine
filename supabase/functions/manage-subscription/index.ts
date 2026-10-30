import { createClient } from "npm:@supabase/supabase-js@2";
import { asaasDay, onOrAfterCheckoutDay } from "../_shared/reconcile-decision.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { decideProration, listProrationPayments, prorationDay } from "../_shared/proration.ts";
import { asaasApiKey, asaasBaseUrl, asaasKeyName } from "../_shared/asaas.ts";
import { decideCancelAccess } from "./cancel-access.ts";
import { handlePayPenalty } from "./penalty.ts";
import { isPenaltyPending, penaltyDescription, penaltyRef, type PenaltyRow } from "../_shared/penalty.ts";
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

/** P25b — mensagens do pedido de upgrade com pagamento da diferença. */
export const OVERDUE_CHANGE_PLAN_MESSAGE =
  "Sua mensalidade está em atraso. Pague a fatura vencida para poder mudar de plano.";
export const UPGRADE_IN_PROGRESS_MESSAGE =
  "Já existe um pedido de mudança de plano sendo processado. Aguarde alguns instantes e tente de novo.";
export const UPGRADE_PAID_CONFIRMING_MESSAGE =
  "Recebemos o pagamento da diferença e estamos confirmando. O novo plano será liberado em instantes.";

export const CANNOT_CALCULATE_MESSAGE =
  "Não conseguimos calcular a diferença agora. Tente de novo em alguns instantes.";
export const MISSING_CUSTOMER_MESSAGE =
  "Não foi possível gerar a cobrança da diferença agora. Nada foi alterado. Tente de novo em instantes.";

/** Colunas do pedido de upgrade pendente (P25a). Limpas juntas, sempre. */
const CLEAR_UPGRADE_PENDENTE = {
  upgrade_pendente_plano: null,
  upgrade_pendente_ciclo: null,
  upgrade_pendente_valor_novo: null,
  upgrade_pendente_diferenca: null,
  upgrade_pendente_payment_id: null,
  upgrade_pendente_invoice_url: null,
  upgrade_pendente_em: null,
};
/** Reserva sem cobrança gravada vale por 60s (duplo clique / pedidos simultâneos). */
const UPGRADE_RESERVA_MS = 60_000;
/** Prazo da cobrança da diferença: hoje + 3 dias (calendário de Brasília). */
const UPGRADE_DUE_DAYS = 3;
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
type Action = "change_plan" | "cancel" | "update_card" | "list_invoices" | "pay_penalty";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Cobrança OVERDUE mais antiga (por vencimento) da lista, ou null. */
export function oldestOverdue(
  rows: Array<Record<string, unknown>>,
): { id: string; value: number; dueDate: string | null; invoiceUrl: string | null } | null {
  const o = rows
    .filter((p) => p?.status === "OVERDUE" && !p?.deleted)
    .sort((a, b) => String(a.dueDate ?? "").localeCompare(String(b.dueDate ?? "")))[0];
  if (!o) return null;
  return {
    id: String(o.id ?? ""),
    value: Number(o.value ?? 0),
    dueDate: (o.dueDate as string | null) ?? null,
    invoiceUrl: ((o.invoiceUrl ?? o.bankSlipUrl) as string | null) ?? null,
  };
}

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
    const VALID_ACTIONS: Action[] = ["change_plan", "cancel", "update_card", "list_invoices", "pay_penalty"];
    if (!action || !VALID_ACTIONS.includes(action)) {
      return json(400, { error: "action inválida. Use: " + VALID_ACTIONS.join(", ") });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const asaasKey = asaasApiKey();
    const asaasHeaders = {
      "Content-Type": "application/json",
      "access_token": asaasKey ?? "",
    };

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

    // P26: multa de cancelamento — procura em TODAS as linhas do usuário.
    if (action === "pay_penalty") {
      return json(200, await handlePayPenalty({
        db: supabaseAdmin,
        userId,
        fetchAsaas,
        hasKey: !!asaasKey,
        findCustomerId: async () => {
          const { data: prof } = await supabaseAdmin.from("profiles").select("email").eq("user_id", userId).maybeSingle();
          const email = (prof?.email as string | null) ?? (claimsData.claims.email as string | undefined) ?? null;
          return (await customerIdsForUser(fetchAsaas, null, email))[0] ?? null;
        },
      }));
    }

    // 3. Assinatura viva do usuário
    const LIVE_STATUSES = ["ativo", "trial", "inadimplente", "atrasado", "pendente", "cancelado"];
    const { data: assinatura } = await supabaseAdmin
      .from("assinaturas")
      .select(
        "id, plano, status, asaas_subscription_id, asaas_subscription_id_anterior, asaas_customer_id, asaas_checkout_id, asaas_checkout_created_at, data_vencimento, trial_ends_at, ciclo_contratado, ciclos_pagos, counted_payment_ids, compromisso_inicio, compromisso_meses, upgrade_pendente_plano, upgrade_pendente_ciclo, upgrade_pendente_valor_novo, upgrade_pendente_diferenca, upgrade_pendente_payment_id, upgrade_pendente_invoice_url, upgrade_pendente_em, upgrade_ultimo_payment_id, multa_pendente_valor, multa_pendente_ciclos, multa_pendente_payment_id, multa_pendente_invoice_url, multa_pendente_em, multa_ultimo_payment_id",
      )
      .eq("user_id", userId)
      .in("status", LIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!assinatura) {
      return json(404, { error: "Nenhuma assinatura encontrada para este usuário." });
    }

    let subId = assinatura.asaas_subscription_id as string | null;

    /**
     * Cobrança avulsa (PAYMENT único) no Asaas — usada só pela multa de
     * fidelidade do ciclo anual (o upgrade cria a própria cobrança).
     * Nunca lança: em falha (HTTP, rede ou sem id), loga e devolve null.
     */
    const cobrarAvulsa = async (args: {
      customerId: string;
      value: number;
      description: string;
      externalReference: string;
    }): Promise<{ id: string; value: number; invoiceUrl: string | null } | null> => {
      // Vencimento: hoje no calendário de Brasília.
      const today = prorationDay(new Date()) ?? new Date().toISOString().slice(0, 10);
      let pay: Awaited<ReturnType<typeof fetchAsaas>>;
      try {
        pay = await fetchAsaas(`/payments`, {
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
      } catch (err) {
        console.error("cobrarAvulsa network error:", err instanceof Error ? err.message : String(err), "ref:", args.externalReference);
        return null;
      }
      const id = pay.ok ? String(pay.json?.id ?? "") : "";
      if (!pay.ok || !id) {
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
        id,
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

      // P25b: com mensalidade em atraso não há mudança de plano — nada muda.
      // "atrasado" (status antigo) é tratado exatamente como "inadimplente".
      if (assinatura.status === "inadimplente" || assinatura.status === "atrasado") {
        return json(200, { ok: false, reason: "pagamento_em_atraso", message: OVERDUE_CHANGE_PLAN_MESSAGE });
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

      // 3.0 P25b — pedido de upgrade já existente (aguardando pagamento da diferença).
      const pendingUpgradeId = (assinatura.upgrade_pendente_payment_id as string | null) ?? null;
      const pendingEmMs = assinatura.upgrade_pendente_em
        ? new Date(assinatura.upgrade_pendente_em as string).getTime()
        : NaN;
      // Reserva recente sem cobrança gravada = outro pedido ainda em curso.
      if (!pendingUpgradeId && !Number.isNaN(pendingEmMs) && Date.now() - pendingEmMs < UPGRADE_RESERVA_MS) {
        return json(200, { ok: false, reason: "pedido_em_andamento", message: UPGRADE_IN_PROGRESS_MESSAGE });
      }
      if (pendingUpgradeId) {
        const samePending =
          assinatura.upgrade_pendente_plano === plano && assinatura.upgrade_pendente_ciclo === ciclo;
        if (samePending) {
          // Mesmo pedido de novo: nada é criado enquanto a cobrança estiver aberta.
          let look: Awaited<ReturnType<typeof fetchAsaas>> | null = null;
          try { look = await fetchAsaas(`/payments/${encodeURIComponent(pendingUpgradeId)}`); } catch { look = null; }
          const st = String(look?.json?.status ?? "").toUpperCase();
          const existingResponse = () => json(200, {
            ok: true,
            mode: "pending_payment",
            reused: true,
            plano: assinatura.plano,
            planoPendente: assinatura.upgrade_pendente_plano,
            ciclo: assinatura.upgrade_pendente_ciclo,
            diferenca: Number(assinatura.upgrade_pendente_diferenca ?? 0),
            dueDate: (look?.json?.dueDate as string | undefined) ?? null,
            invoiceUrl: (assinatura.upgrade_pendente_invoice_url as string | null) ?? null,
          });
          // Consulta indisponível: devolve o pedido gravado (nunca cria outra cobrança).
          if (!look || (!look.ok && look.status !== 404)) return existingResponse();
          if (look.ok && look.json?.deleted !== true && st === "PENDING") return existingResponse();
          if (look.ok && look.json?.deleted !== true && ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(st)) {
            // Já pago, aguardando o webhook promover: nada a fazer aqui.
            return json(200, { ok: false, reason: "pedido_em_andamento", message: UPGRADE_PAID_CONFIRMING_MESSAGE });
          }
          // Removida / vencida / outro estado: substitui como um pedido diferente.
        }
      }
      // Pedido diferente (ou cobrança não mais aberta): remove a cobrança anterior
      // ANTES de aplicar/criar o novo — mas só depois das recusas (P25b-fix), para
      // que uma recusa nunca mexa no pedido anterior. Devolve resposta só em falha.
      const replacePreviousPending = async (): Promise<Response | null> => {
        if (!pendingUpgradeId) return null;
        let del: Awaited<ReturnType<typeof fetchAsaas>> | null = null;
        try {
          del = await fetchAsaas(`/payments/${encodeURIComponent(pendingUpgradeId)}`, { method: "DELETE" });
        } catch (err) {
          console.error("change_plan: DELETE da cobrança de upgrade anterior erro:", pendingUpgradeId, err instanceof Error ? err.message : String(err));
        }
        if (!del || (!del.ok && del.status !== 404)) {
          console.error("change_plan: cobrança de upgrade anterior não removida, nada alterado:", assinatura.id, pendingUpgradeId, del?.status ?? "network");
          return json(502, { error: "Não foi possível cancelar o pedido de mudança de plano anterior. Nada foi alterado. Tente de novo em instantes." });
        }
        // Limpa só se ainda é o mesmo pedido (ou se o webhook já limpou ao receber o DELETE).
        const { data: cleared, error: clearErr } = await supabaseAdmin
          .from("assinaturas")
          .update({ ...CLEAR_UPGRADE_PENDENTE, upgrade_ultimo_payment_id: pendingUpgradeId })
          .eq("id", assinatura.id)
          .or(`upgrade_pendente_payment_id.eq.${pendingUpgradeId},and(upgrade_pendente_payment_id.is.null,upgrade_pendente_em.is.null)`)
          .select("id");
        if (clearErr) return json(500, { error: clearErr.message });
        if (!cleared || cleared.length === 0) {
          return json(200, { ok: false, reason: "pedido_em_andamento", message: UPGRADE_IN_PROGRESS_MESSAGE });
        }
        console.log("change_plan: pedido de upgrade anterior removido:", assinatura.id, pendingUpgradeId);
        return null;
      };

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

      /** Troca imediata: novo valor no Asaas e, só depois, plano/ciclo no banco. */
      const applyImmediately = async () => {
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
        const { error } = await supabaseAdmin
          .from("assinaturas")
          .update({ plano, ciclo_contratado: ciclo })
          .eq("id", assinatura.id);
        if (error) return json(500, { error: error.message });
        return json(200, {
          ok: true,
          success: true,
          mode: "asaas",
          plano,
          ciclo,
          value,
          previousValue: oldValue,
          nextDueDate: upd.json?.nextDueDate ?? null,
          proRata: null,
        });
      };

      // 3.1b P25b — teste grátis com vínculo: nada foi pago, então não há
      // diferença a cobrar nem pedido pendente. Troca imediata.
      if (assinatura.status === "trial") {
        console.log("proration diagnostic:", JSON.stringify({ action, userId, plan: plano, oldValue, newValue: value, status: "trial", reason: "trial_no_charge", path: "immediate" }));
        const replaced = await replacePreviousPending();
        if (replaced) return replaced;
        return await applyImmediately();
      }

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
      // P25b-fix: aumento de preço sem como calcular a diferença (lista de
      // cobranças indisponível ou sem vencimento de referência) → recusa.
      const cannotCalculate = delta > 0 && (pendingLookupFailed || decision.reason === "no_next_due");
      const needsCharge = !cannotCalculate && proRataValue >= 5;
      const path = cannotCalculate
        ? "cannot_calculate"
        : needsCharge ? (customerId ? "pending_payment" : "missing_customer") : "immediate";

      console.log("proration diagnostic:", JSON.stringify({ action, userId, plan: plano, oldValue, newValue: value, delta, nextDue, nextDueDate: nextDue, referenceDue: decision.referenceDue, referenceSource: decision.referenceSource, cycleDays, daysLeft, hasPending, pendingDueDates: pendingPayments.map((p) => p.dueDate ?? null), reason, prorata: needsCharge ? proRataValue : 0, proRataValue, invoiceStatus: needsCharge ? (customerId ? "planned" : "missing_customer") : "not_required", path }));

      if (cannotCalculate) {
        console.error("change_plan: diferença não calculável, nada alterado:", assinatura.id, reason);
        return json(200, { ok: false, reason: "nao_foi_possivel_calcular", message: CANNOT_CALCULATE_MESSAGE });
      }

      // Cobrança necessária sem cliente no Asaas: nunca libera o upgrade de graça.
      if (needsCharge && !customerId) {
        console.error("change_plan: diferença exigida sem customer no Asaas, nada alterado:", assinatura.id, proRataValue);
        return json(200, { ok: false, reason: "cobranca_indisponivel", message: MISSING_CUSTOMER_MESSAGE });
      }

      const replaced = await replacePreviousPending();
      if (replaced) return replaced;

      // Sem cobrança necessária (redução, só ciclo, abaixo do mínimo, ciclo
      // vencido em aberto): imediato, como hoje.
      if (!needsCharge) return await applyImmediately();

      // 3.4 P25b — reserva o pedido (UPDATE condicional atômico): só um pedido
      // por vez cria cobrança; duplo clique / requisição simultânea recebe 0 linhas.
      const reservedAt = new Date().toISOString();
      const reservaCutoff = new Date(Date.now() - UPGRADE_RESERVA_MS).toISOString();
      const releaseReservation = async () => {
        const { error: relErr } = await supabaseAdmin
          .from("assinaturas")
          .update(CLEAR_UPGRADE_PENDENTE)
          .eq("id", assinatura.id)
          .eq("upgrade_pendente_em", reservedAt)
          .is("upgrade_pendente_payment_id", null);
        if (relErr) console.error("change_plan: erro ao liberar reserva de upgrade:", assinatura.id, relErr.message);
      };
      const { data: reserved, error: reserveErr } = await supabaseAdmin
        .from("assinaturas")
        .update({ upgrade_pendente_plano: plano, upgrade_pendente_ciclo: ciclo, upgrade_pendente_em: reservedAt })
        .eq("id", assinatura.id)
        .is("upgrade_pendente_payment_id", null)
        .or(`upgrade_pendente_em.is.null,upgrade_pendente_em.lt."${reservaCutoff}"`)
        .select("id");
      if (reserveErr) return json(500, { error: reserveErr.message });
      if (!reserved || reserved.length === 0) {
        return json(200, { ok: false, reason: "pedido_em_andamento", message: UPGRADE_IN_PROGRESS_MESSAGE });
      }

      // 3.5 Cobrança NOVA da diferença (vence em hoje + 3 dias, Brasília).
      const hojeBrt = prorationDay(new Date())!;
      const dueDate = new Date(Date.parse(`${hojeBrt}T00:00:00Z`) + UPGRADE_DUE_DAYS * 86_400_000).toISOString().slice(0, 10);
      const externalReference = `prorata:${assinatura.id}:${plano}:${Math.floor(Date.now() / 1000)}`;
      let charge: Awaited<ReturnType<typeof fetchAsaas>> | null = null;
      try {
        charge = await fetchAsaas(`/payments`, {
          method: "POST",
          body: JSON.stringify({
            customer: customerId,
            billingType: "CREDIT_CARD",
            value: proRataValue,
            dueDate,
            description:
              `Ivero — diferença proporcional do upgrade para ${plano} ` +
              `(${daysLeft} dia(s) restantes do ciclo atual)`,
            externalReference,
          }),
        });
      } catch (err) {
        console.error("change_plan: POST /payments erro:", err instanceof Error ? err.message : String(err));
        charge = null;
      }
      const chargeId = charge?.ok ? String(charge.json?.id ?? "") : "";
      if (!charge || !charge.ok || !chargeId) {
        console.error("change_plan: cobrança da diferença não criada, nada alterado:", assinatura.id, charge?.status ?? "network", charge?.text?.slice(0, 500) ?? "");
        await releaseReservation();
        return json(502, { error: "Não foi possível gerar a cobrança da diferença agora. Nada foi alterado. Tente de novo em instantes." });
      }
      const invoiceUrl: string | null = charge.json?.invoiceUrl ?? charge.json?.bankSlipUrl ?? null;

      // 3.6 Grava o pedido. Plano, ciclo e valor da assinatura no Asaas NÃO mudam.
      const { data: saved, error: saveErr } = await supabaseAdmin
        .from("assinaturas")
        .update({
          upgrade_pendente_plano: plano,
          upgrade_pendente_ciclo: ciclo,
          upgrade_pendente_valor_novo: value,
          upgrade_pendente_diferenca: proRataValue,
          upgrade_pendente_payment_id: chargeId,
          upgrade_pendente_invoice_url: invoiceUrl,
          upgrade_pendente_em: reservedAt,
        })
        .eq("id", assinatura.id)
        .eq("upgrade_pendente_em", reservedAt)
        .is("upgrade_pendente_payment_id", null)
        .select("id");
      if (saveErr || !saved || saved.length === 0) {
        console.error("change_plan: pedido de upgrade não gravado, removendo a cobrança:", assinatura.id, chargeId, saveErr?.message ?? "0 linhas");
        try {
          const undo = await fetchAsaas(`/payments/${encodeURIComponent(chargeId)}`, { method: "DELETE" });
          if (!undo.ok && undo.status !== 404) console.error("ALERTA cobrança de upgrade órfã não removida:", assinatura.id, chargeId, undo.status);
        } catch (err) {
          console.error("ALERTA cobrança de upgrade órfã não removida:", assinatura.id, chargeId, err instanceof Error ? err.message : String(err));
        }
        await releaseReservation();
        return json(500, { error: "Não foi possível registrar o pedido de mudança de plano. Nada foi alterado. Tente de novo em instantes." });
      }

      console.log("change_plan: pedido de upgrade aguardando pagamento:", assinatura.id, plano, ciclo, chargeId, proRataValue);
      return json(200, {
        ok: true,
        mode: "pending_payment",
        plano: assinatura.plano,
        planoPendente: plano,
        ciclo,
        diferenca: proRataValue,
        dueDate,
        invoiceUrl,
      });
    }

    if (action === "cancel") {
      type CancelRow = PenaltyRow & {
        data_vencimento?: string | null;
        trial_ends_at?: string | null;
        ciclo_contratado?: string | null;
        ciclos_pagos?: number | null;
        counted_payment_ids?: string[] | null;
      };
      /** Multa gravada na linha, no formato da resposta do cancelamento. */
      const penaltyOf = (row: CancelRow) =>
        isPenaltyPending(row)
          ? {
            value: Number(row.multa_pendente_valor),
            ciclos: Number(row.multa_pendente_ciclos ?? 0),
            invoiceUrl: row.multa_pendente_invoice_url ?? null,
            ...(row.multa_pendente_payment_id ? {} : { error: "cobranca_indisponivel" }),
          }
          : null;
      /** P26: linha já cancelada → nada é recalculado nem cobrado de novo. */
      const reusedCancel = (row: CancelRow, cleaned: string[] = []) => {
        const pagos = Number(row.ciclos_pagos ?? 0);
        const cancelledTrial = pagos === 0 && !(Array.isArray(row.counted_payment_ids) && row.counted_payment_ids.length);
        const until = row.data_vencimento ?? row.trial_ends_at ?? null;
        const untilMs = until ? new Date(until).getTime() : NaN;
        return json(200, {
          ok: true,
          success: true,
          reused: true,
          acessoAte: until,
          accessUntil: until,
          isTrial: cancelledTrial,
          endsNow: cancelledTrial && (Number.isNaN(untilMs) || untilMs <= Date.now()),
          ciclo: normalizeCiclo(row.ciclo_contratado),
          ciclosPagos: pagos,
          multa: penaltyOf(row),
          ...(cleaned.length ? { cleaned } : {}),
        });
      };

      // Cancelamento FAIL-CLOSED: quem já registrou cartão/checkout só tem a
      // linha cancelada depois de confirmarmos que NENHUMA assinatura viva do
      // usuário continua no Asaas. Teste sem cartão (sem checkout, cliente nem
      // assinatura) cancela como antes, sem chamar o Asaas.
      // Devolve a resposta de erro (linha intacta) ou as assinaturas removidas.
      const registeredWithProvider = !!(
        assinatura.asaas_subscription_id || assinatura.asaas_checkout_id || assinatura.asaas_customer_id
      );
      const providerCleanup = async (): Promise<Response | { deleted: string[] }> => {
        if (!registeredWithProvider) return { deleted: [] };
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
        console.log("cancel: Asaas confirmado sem assinatura viva", userId, JSON.stringify({ customerIds, deleted: outcome.deleted }));
        return { deleted: outcome.deleted };
      };

      // P26-fix1: linha já cancelada → a limpeza no Asaas roda de novo (rede de
      // segurança contra assinatura viva que continuaria cobrando), mas a multa
      // não é recalculada nem cobrada: devolve a multa gravada.
      if (assinatura.status === "cancelado") {
        const cleanup = await providerCleanup();
        if (cleanup instanceof Response) return cleanup;
        const cleaned = cleanup.deleted;
        if (cleaned.length) console.log(`cancel: limpeza repetida removeu ${cleaned.join(",")}`, userId, assinatura.id);
        else console.log("cancel: assinatura já cancelada, nada recalculado", userId, assinatura.id);
        return reusedCancel(assinatura as CancelRow, cleaned);
      }

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

      let removedSubId: string | null = subId;
      if (registeredWithProvider) {
        const cleanup = await providerCleanup();
        if (cleanup instanceof Response) return cleanup;
        removedSubId = subId ?? cleanup.deleted[0] ?? null;
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

      // P25b: pedido de upgrade pendente deixa de existir com o cancelamento.
      // Falha ao remover a cobrança no Asaas não impede o cancelamento.
      const pendingUpgradeId = (assinatura.upgrade_pendente_payment_id as string | null) ?? null;
      let upgradeCleanup: Record<string, unknown> = {};
      if (pendingUpgradeId) {
        let removed = false;
        if (asaasKey) {
          try {
            const del = await fetchAsaas(`/payments/${encodeURIComponent(pendingUpgradeId)}`, { method: "DELETE" });
            removed = del.ok || del.status === 404;
          } catch { removed = false; }
        }
        if (!removed) {
          console.error(`ALERTA upgrade pendente não removido no cancelamento ${assinatura.id} ${pendingUpgradeId}`);
        }
        upgradeCleanup = { ...CLEAR_UPGRADE_PENDENTE, upgrade_ultimo_payment_id: pendingUpgradeId };
      }

      // P26 — multa de fidelidade: a cobrança é criada ANTES de gravar o
      // cancelamento para que valor, ciclos e cobrança fiquem na MESMA
      // instrução. Falha ao criar a cobrança não impede o cancelamento: valor e
      // ciclos ficam gravados com payment_id nulo (pay_penalty cria depois).
      let multa: { value: number; ciclos: number; invoiceUrl: string | null; error?: string } | null = null;
      let penaltyPatch: Record<string, unknown> = {};
      let chargeId: string | null = null;
      if (multaValue >= 5) {
        const customerParaMulta = assinatura.asaas_customer_id as string | null;
        const cobranca = customerParaMulta && asaasKey
          ? await cobrarAvulsa({
            customerId: customerParaMulta,
            value: multaValue,
            description: penaltyDescription(assinatura.plano as string, ciclosComDesconto),
            externalReference: penaltyRef(assinatura.id as string, assinatura.plano as string),
          })
          : null;
        if (!cobranca) {
          console.error("cancel: cobrança da multa não criada, fica pendente para pay_penalty:", userId, multaValue, customerParaMulta ? "falha no Asaas" : "sem customer");
        }
        chargeId = cobranca?.id ?? null;
        penaltyPatch = {
          multa_pendente_valor: multaValue,
          multa_pendente_ciclos: ciclosComDesconto,
          multa_pendente_payment_id: chargeId,
          multa_pendente_invoice_url: cobranca?.invoiceUrl ?? null,
          multa_pendente_em: cobranca ? new Date().toISOString() : null,
        };
        multa = cobranca
          ? { value: multaValue, ciclos: ciclosComDesconto, invoiceUrl: cobranca.invoiceUrl }
          : { value: multaValue, ciclos: ciclosComDesconto, invoiceUrl: null, error: "cobranca_indisponivel" };
      } else if (multaValue > 0) {
        console.log("cancel: multa abaixo do mínimo de cobrança, não gerada:", userId, multaValue);
      }
      const undoCharge = async () => {
        if (!chargeId) return;
        try {
          const undo = await fetchAsaas(`/payments/${encodeURIComponent(chargeId)}`, { method: "DELETE" });
          if (!undo.ok && undo.status !== 404) console.error("ALERTA multa duplicada não removida", assinatura.id, chargeId, undo.status);
        } catch (err) {
          console.error("ALERTA multa duplicada não removida", assinatura.id, chargeId, err instanceof Error ? err.message : String(err));
        }
      };

      // Gravação condicional: só uma chamada de cancelamento vence.
      const { data: cancelled, error } = await supabaseAdmin
        .from("assinaturas")
        .update({
          status: "cancelado",
          carencia_ate: null,
          asaas_subscription_id: null,
          asaas_subscription_id_anterior: removedSubId,
          ...(access.dataVencimento !== undefined ? { data_vencimento: access.dataVencimento } : {}),
          ...upgradeCleanup,
          ...penaltyPatch,
        })
        .eq("id", assinatura.id)
        .neq("status", "cancelado")
        .select("id");
      if (error) {
        await undoCharge();
        return json(500, { error: error.message });
      }
      if (!cancelled || cancelled.length === 0) {
        // Outra chamada simultânea já cancelou: a cobrança desta é desfeita.
        await undoCharge();
        const { data: fresh } = await supabaseAdmin
          .from("assinaturas")
          .select("data_vencimento, trial_ends_at, ciclo_contratado, ciclos_pagos, counted_payment_ids, multa_pendente_valor, multa_pendente_ciclos, multa_pendente_payment_id, multa_pendente_invoice_url, multa_pendente_em, multa_ultimo_payment_id")
          .eq("id", assinatura.id)
          .maybeSingle();
        console.log("cancel: corrida — outra chamada já cancelou", userId, assinatura.id);
        return reusedCancel(((fresh as CancelRow | null) ?? (assinatura as CancelRow)));
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
        "multaPaymentId:",
        chargeId,
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
      let url: string =
        list.json?.data?.[0]?.invoiceUrl || list.json?.data?.[0]?.bankSlipUrl || "";
      if (!url) {
        // Sem cobrança pendente: a mensalidade VENCIDA mais antiga. Na fatura
        // hospedada pelo Asaas o cliente paga com o cartão que escolher.
        const overdueList = await fetchAsaas(`/subscriptions/${resolved}/payments?status=OVERDUE&limit=50`);
        const oldest = oldestOverdue(Array.isArray(overdueList.json?.data) ? overdueList.json!.data : []);
        url = oldest?.invoiceUrl ?? "";
      }
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

    // Mensalidade vencida mais antiga: tem prioridade sobre "próxima cobrança" na tela.
    const overdue = oldestOverdue(rows);
    return json(200, { success: true, invoices, next, overdue });
  } catch (err) {
    console.error("manage-subscription error:", err instanceof Error ? err.message : String(err));
    return json(500, { error: (err as Error).message || "Erro inesperado." });
  }
});
