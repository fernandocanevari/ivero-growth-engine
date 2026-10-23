import { brDay } from "./reconcile-decision.ts";
import { effectiveTrialEndsAt, trialEligibility, PAID_HISTORY_STATUSES, type HistoryRow } from "./trial-eligibility.ts";

export type CheckoutContext = {
  prev: Record<string, unknown>;
  requested: { value: number; cycle: string; plano: string; ciclo: string };
  link?: string;
  completed?: boolean;
  /**
   * Retomada de um teste grátis cancelado: a 1ª cobrança fica no fim do teste
   * ORIGINAL. Quando o cartão é registrado (CHECKOUT_PAID / SUBSCRIPTION_CREATED)
   * a linha volta a 'trial' com este mesmo trial_ends_at.
   */
  resumeTrialEndsAt?: string;
};

/** Vida útil da Checkout Session criada em create-checkout (minutesToExpire: 60). */
export const CHECKOUT_LIFETIME_MS = 60 * 60 * 1000;

export function checkoutSchedule(history: HistoryRow[], now = new Date()) {
  const eligibility = trialEligibility(history, now.getTime());
  const trialEndsAt = eligibility.trialConcedido && eligibility.trialEmCursoMs !== null
    ? new Date(eligibility.trialEmCursoMs).toISOString() : null;
  const nextDueDate = brDay(trialEndsAt ?? now.toISOString());
  if (!nextDueDate) throw new Error("invalid_checkout_date");
  return { ...eligibility, trialEndsAt, nextDueDate };
}

const RESUME_LIVE_STATUSES = ["ativo", "trial", "inadimplente", "atrasado", "pendente"];
const RESUME_DEAD_STATUSES = ["expirado", "trial_expirado", "cancelado"];

type ResumeRow = HistoryRow & { counted_payment_ids?: string[] | null };

/**
 * Quem cancelou DURANTE o teste grátis e volta ANTES do fim original do teste:
 * não é um novo teste (trialEligibility continua negando), é a retomada do
 * mesmo — a 1ª cobrança fica agendada para o dia (Brasília) do trial_ends_at
 * original. Exige: nenhuma linha viva, linha morta mais recente 'cancelado',
 * nenhum pagamento em todo o histórico e fim do teste ainda no futuro.
 */
export function resumableCancelledTrial(history: ResumeRow[], now = new Date()): { trialEndsAt: string; nextDueDate: string } | null {
  if (history.some((r) => RESUME_LIVE_STATUSES.includes(r.status ?? ""))) return null;
  const paid = history.some((r) =>
    (r.ciclos_pagos ?? 0) > 0 || (r.counted_payment_ids?.length ?? 0) > 0 || PAID_HISTORY_STATUSES.includes(r.status ?? "")
  );
  if (paid) return null;
  const row = history.find((r) => RESUME_DEAD_STATUSES.includes(r.status ?? ""));
  if (!row || row.status !== "cancelado") return null;
  const end = effectiveTrialEndsAt(row);
  const endMs = end ? Date.parse(end) : NaN;
  if (!end || Number.isNaN(endMs) || endMs <= now.getTime()) return null;
  const nextDueDate = brDay(end);
  return nextDueDate ? { trialEndsAt: end, nextDueDate } : null;
}

export type PreviousCheckoutAction = "blocked" | "reuse" | "cancel" | "skip";

/**
 * O que fazer com a Checkout Session anterior gravada na linha.
 * - Linha NÃO cancelada: igual ao comportamento anterior — sessão concluída ou
 *   assinatura vinculada = pagamento sendo conferido (409); sessão recente com o
 *   mesmo pedido = reaproveita o link; senão encerra a anterior no Asaas.
 * - Linha 'cancelado': pode sempre iniciar um checkout novo. Sessão concluída,
 *   vínculo antigo ou sessão já expirada nunca bloqueiam ("skip"); só uma sessão
 *   ainda aberta (recente e não concluída) é reaproveitada ou encerrada.
 */
export function previousCheckoutAction(
  row: { status?: string | null; asaas_subscription_id?: string | null; asaas_checkout_created_at?: string | null; checkout_context?: unknown },
  requested: { value: number; plano: string; ciclo: string },
  nowMs = Date.now(),
): PreviousCheckoutAction {
  const ctx = row.checkout_context as { link?: string; requested?: { value?: number; plano?: string; ciclo?: string }; completed?: boolean } | null | undefined;
  const created = row.asaas_checkout_created_at ? Date.parse(row.asaas_checkout_created_at) : NaN;
  const fresh = Number.isFinite(created) && nowMs - created < CHECKOUT_LIFETIME_MS;
  if (row.status === "cancelado") {
    if (ctx?.completed || row.asaas_subscription_id || !fresh) return "skip";
  } else if (ctx?.completed || row.asaas_subscription_id) {
    return "blocked";
  }
  if (fresh && ctx?.link && ctx.requested?.value === requested.value && ctx.requested?.plano === requested.plano && ctx.requested?.ciclo === requested.ciclo) {
    return "reuse";
  }
  return "cancel";
}

const PREVIOUS_FIELDS = [
  "status", "trial_ends_at", "plano", "ciclo_contratado", "plano_pretendido", "ciclo_pretendido",
  "data_inicio", "data_vencimento", "asaas_subscription_id", "asaas_customer_id",
  "compromisso_inicio", "compromisso_meses", "ciclos_pagos",
] as const;

export function preserveCheckoutState(
  row: Record<string, unknown> | null,
  requested: CheckoutContext["requested"],
  link: string,
  extra: Pick<CheckoutContext, "resumeTrialEndsAt"> = {},
): CheckoutContext {
  const previous = row?.checkout_context as CheckoutContext | null | undefined;
  // Um contexto já CONCLUÍDO pertence a um checkout encerrado (ex.: teste com
  // cartão depois cancelado): o estado a restaurar é o atual da linha.
  const prev = (!previous?.completed && previous?.prev) ||
    Object.fromEntries(PREVIOUS_FIELDS.filter((k) => row && k in row).map((k) => [k, row?.[k]]));
  return { prev, requested, link, ...(extra.resumeTrialEndsAt ? { resumeTrialEndsAt: extra.resumeTrialEndsAt } : {}) };
}

export function restoreCheckoutState(row: HistoryRow & { checkout_context?: CheckoutContext | null }, now = new Date()): Record<string, unknown> {
  const context = row.checkout_context;
  const prev = context?.prev ?? {};
  const restored = Object.fromEntries(PREVIOUS_FIELDS.filter((k) => k in prev).map((k) => [k, prev[k]]));
  const trialEnd = typeof prev.trial_ends_at === "string" ? prev.trial_ends_at : effectiveTrialEndsAt(row);
  let status = typeof prev.status === "string" ? prev.status : row.status;
  if (status === "pendente" || !status) status = trialEnd && Date.parse(trialEnd) > now.getTime() ? "trial" : "expirado";
  if (status === "trial" && (!trialEnd || Date.parse(trialEnd) <= now.getTime())) status = "expirado";
  return { ...restored, status, trial_ends_at: trialEnd, plano_pretendido: prev.plano_pretendido ?? null,
    ciclo_pretendido: prev.ciclo_pretendido ?? null, asaas_checkout_id: null, asaas_checkout_created_at: null,
    checkout_context: null };
}
