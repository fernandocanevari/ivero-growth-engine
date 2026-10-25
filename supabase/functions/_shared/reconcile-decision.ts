// Decisões puras de pagamento (sem rede/banco) — usadas pela reconciliação
// (reconcile-asaas) e pelo aviso do Asaas (asaas-webhook), para que o mesmo
// estado no Asaas produza sempre o mesmo resultado.
//
// Status oficiais de uma Checkout Session no Asaas (docs.asaas.com, "Asaas
// Checkout FAQ"): ACTIVE = disponível para pagamento (sessão ABERTA, nada
// pago), PAID = paga, CANCELED = cancelada, EXPIRED = expirada.
// Regra: só cobrança RECEIVED/CONFIRMED ativa a conta e promove planos.
// Sessão PAID sozinha apenas vincula os ids (a 1ª cobrança pode estar
// agendada para o fim do trial).

export const PAID_PAYMENT_STATUSES = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
export const CLOSED_CHECKOUT_STATUSES = ["EXPIRED", "CANCELED", "CANCELLED"];

export type PaymentOutcome =
  /** cobrança confirmada → 'ativo' + promoção dos planos pretendidos */
  | "activate"
  /** sessão concluída sem cobrança confirmada → só vincula ids, status intacto */
  | "link"
  /** sessão expirada/cancelada → nunca promove */
  | "closed"
  /** sessão aberta ou sem informação → nada muda */
  | "none";

export interface ReconcileInput {
  checkoutStatus: string;
  paymentStatuses: string[];
}

export function decideReconcile(i: ReconcileInput): PaymentOutcome {
  if (i.paymentStatuses.some((s) => PAID_PAYMENT_STATUSES.includes(s))) return "activate";
  if (i.checkoutStatus === "PAID") return "link";
  if (CLOSED_CHECKOUT_STATUSES.includes(i.checkoutStatus)) return "closed";
  return "none";
}

/** Mesmo critério aplicado aos eventos do aviso do Asaas. */
export function decideWebhookEvent(event: string, isAvulsa: boolean): PaymentOutcome {
  if ((event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") && !isAvulsa) return "activate";
  if (event === "CHECKOUT_PAID") return "link";
  if (event === "CHECKOUT_CANCELED" || event === "CHECKOUT_EXPIRED") return "closed";
  return "none";
}

/** Evento do aviso equivalente ao estado lido pela reconciliação. */
export function webhookEventFor(i: ReconcileInput): string {
  if (i.paymentStatuses.some((s) => PAID_PAYMENT_STATUSES.includes(s))) return "PAYMENT_CONFIRMED";
  if (i.checkoutStatus === "PAID") return "CHECKOUT_PAID";
  if (i.checkoutStatus === "EXPIRED") return "CHECKOUT_EXPIRED";
  if (i.checkoutStatus === "CANCELED") return "CHECKOUT_CANCELED";
  return "";
}

// ---------------------------------------------------------------------------
// Regras A–E (vínculo estrito ao checkout atual + validação por DIA).
// O Asaas devolve datas de cobrança como "YYYY-MM-DD" (horário de Brasília);
// por isso a comparação com asaas_checkout_created_at é feita por DIA no fuso
// America/Sao_Paulo — nunca contra o timestamp UTC completo.
// ---------------------------------------------------------------------------

/** Dia (YYYY-MM-DD) de um timestamp no fuso America/Sao_Paulo. */
export function brDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

/** Parte de data de um campo do Asaas ("YYYY-MM-DD" ou ISO completo). */
export function asaasDay(v: unknown): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(v)) return null;
  // ISO completo com horário → converte para o dia em Brasília.
  return v.length > 10 ? brDay(v) : v.slice(0, 10);
}

/** true quando `day` (YYYY-MM-DD) é o mesmo dia ou posterior ao dia do checkout. */
export function onOrAfterCheckoutDay(day: string | null, checkoutCreatedAt: string | null | undefined): boolean {
  const ck = brDay(checkoutCreatedAt ?? null);
  if (!day || !ck) return false;
  return day >= ck;
}

export interface AsaasPayment {
  id?: string;
  status?: string;
  subscription?: string | null;
  checkoutSession?: string | null;
  customer?: string | null;
  confirmedDate?: string | null;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  dateCreated?: string | null;
  dueDate?: string | null;
}

/** Dia que comprova o pagamento (confirmação > pagamento > criação). */
export function paymentProofDay(p: AsaasPayment): string | null {
  return asaasDay(p.confirmedDate) ?? asaasDay(p.paymentDate) ?? asaasDay(p.clientPaymentDate) ?? asaasDay(p.dateCreated);
}

/** Cobrança avulsa: sem assinatura e sem checkout (pró-rata, multa...). */
export function isOneOffPayment(p: AsaasPayment): boolean {
  return !p.subscription && !p.checkoutSession;
}

export type DecidingRule = "A+B" | "A" | "C";

export interface CheckoutEvaluation {
  outcome: PaymentOutcome; // "activate" | "link" | "none"
  rule: DecidingRule;
  subscriptionId: string | null;
  customerId: string | null;
  linkedCount: number;
  checkoutDay: string | null;
  comparedDays: string[];
}

/**
 * Avalia as cobranças devolvidas por GET /payments?checkoutSession={id}.
 * A: só vale cobrança cujo checkoutSession é o checkout atual (vínculo).
 * B: só ativa cobrança RECEIVED/CONFIRMED com dia ≥ dia do checkout (Brasília).
 * C: nenhuma cobrança vinculada → nada muda (sem ativar, promover ou vincular).
 * Cobrança vinculada mas não paga (ex.: trial com 1ª cobrança futura PENDING)
 * → "link": grava só o id da assinatura, status/planos intactos.
 */
/** Pagamento já contabilizado (counted_payment_ids) nunca serve de prova para ativar. */
export function isCountedPayment(p: AsaasPayment, counted: string[] | null | undefined): boolean {
  return !!p?.id && Array.isArray(counted) && counted.includes(p.id);
}

export function evaluateCheckoutPayments(
  checkoutId: string,
  checkoutCreatedAt: string | null | undefined,
  payments: AsaasPayment[],
  countedPaymentIds: string[] | null = null,
): CheckoutEvaluation {
  const linked = payments.filter((p) => p && p.checkoutSession === checkoutId && !isOneOffPayment(p));
  const checkoutDay = brDay(checkoutCreatedAt ?? null);
  const comparedDays = linked.map((p) => `${p.status}:${paymentProofDay(p) ?? "?"}`);
  const base = {
    linkedCount: linked.length, checkoutDay, comparedDays,
    customerId: linked.find((p) => p.customer)?.customer ?? null,
  };
  const paid = linked.find((p) =>
    PAID_PAYMENT_STATUSES.includes(p.status ?? "") && onOrAfterCheckoutDay(paymentProofDay(p), checkoutCreatedAt) &&
    !isCountedPayment(p, countedPaymentIds)
  );
  if (paid) return { ...base, outcome: "activate", rule: "A+B", subscriptionId: paid.subscription ?? null };
  if (linked.length > 0) {
    return { ...base, outcome: "link", rule: "A", subscriptionId: linked.find((p) => p.subscription)?.subscription ?? null };
  }
  return { ...base, outcome: "none", rule: "C", subscriptionId: null };
}

// ---------------------------------------------------------------------------
// Fallback da reconciliação (quando /payments?checkoutSession devolve 0).
// Nunca adota por cliente sozinho: exige dia ≥ dia do checkout (Brasília) E
// (externalReference == user_id OU valor+ciclo iguais ao pedido) E candidato único.
// ---------------------------------------------------------------------------

export interface AsaasSubscription {
  id?: string;
  dateCreated?: string | null;
  externalReference?: string | null;
  value?: number | null;
  cycle?: string | null;
  status?: string | null;
}

export interface RequestedCheckout { value: number | null; cycle: string | null }

export function selectFallbackSubscription(
  subs: AsaasSubscription[],
  userId: string,
  checkoutCreatedAt: string | null | undefined,
  requested: RequestedCheckout | null,
): { candidate: AsaasSubscription | null; candidates: string[]; reason: "unique" | "none" | "ambiguous" } {
  const seen = new Set<string>();
  const ok = subs.filter((s) => {
    if (!s?.id || seen.has(s.id)) return false;
    seen.add(s.id);
    if (!onOrAfterCheckoutDay(asaasDay(s.dateCreated), checkoutCreatedAt)) return false;
    const byRef = !!s.externalReference && s.externalReference === userId;
    const byValue = !!requested && requested.value !== null && requested.cycle !== null &&
      Number(s.value) === Number(requested.value) && s.cycle === requested.cycle;
    return byRef || byValue;
  });
  const candidates = ok.map((s) => s.id as string);
  if (ok.length === 1) return { candidate: ok[0], candidates, reason: "unique" };
  return { candidate: null, candidates, reason: ok.length === 0 ? "none" : "ambiguous" };
}

/** Cobranças da assinatura adotada: só paga com dia ≥ checkout ativa; resto só vincula. */
export function evaluateSubscriptionPayments(
  subscriptionId: string,
  checkoutCreatedAt: string | null | undefined,
  payments: AsaasPayment[],
  countedPaymentIds: string[] | null = null,
): CheckoutEvaluation {
  const linked = payments.filter((p) => p && p.subscription === subscriptionId);
  const paid = linked.find((p) =>
    PAID_PAYMENT_STATUSES.includes(p.status ?? "") && onOrAfterCheckoutDay(paymentProofDay(p), checkoutCreatedAt) &&
    !isCountedPayment(p, countedPaymentIds)
  );
  return {
    outcome: paid ? "activate" : linked.some((p) => p.status === "PENDING") ? "link" : "none",
    rule: paid ? "A+B" : "A",
    subscriptionId,
    customerId: linked.find((p) => p.customer)?.customer ?? null,
    linkedCount: linked.length,
    checkoutDay: brDay(checkoutCreatedAt ?? null),
    comparedDays: linked.map((p) => `${p.status}:${paymentProofDay(p) ?? "?"}`),
  };
}

/** Chaves (sem valores) de um payload, até 2 níveis — para log sanitizado. */
export function payloadKeys(o: unknown, depth = 2): unknown {
  if (!o || typeof o !== "object" || Array.isArray(o) || depth === 0) return typeof o;
  return Object.fromEntries(Object.entries(o as Record<string, unknown>).map(([k, v]) => [k, payloadKeys(v, depth - 1)]));
}
