import { brDay } from "./reconcile-decision.ts";
import { effectiveTrialEndsAt, trialEligibility, type HistoryRow } from "./trial-eligibility.ts";

export type CheckoutContext = {
  prev: Record<string, unknown>;
  requested: { value: number; cycle: string; plano: string; ciclo: string };
  link?: string;
  completed?: boolean;
};

export function checkoutSchedule(history: HistoryRow[], now = new Date()) {
  const eligibility = trialEligibility(history, now.getTime());
  const trialEndsAt = eligibility.trialConcedido && eligibility.trialEmCursoMs !== null
    ? new Date(eligibility.trialEmCursoMs).toISOString() : null;
  const nextDueDate = brDay(trialEndsAt ?? now.toISOString());
  if (!nextDueDate) throw new Error("invalid_checkout_date");
  return { ...eligibility, trialEndsAt, nextDueDate };
}

const PREVIOUS_FIELDS = [
  "status", "trial_ends_at", "plano", "ciclo_contratado", "plano_pretendido", "ciclo_pretendido",
  "data_inicio", "data_vencimento", "asaas_subscription_id", "asaas_customer_id",
  "compromisso_inicio", "compromisso_meses", "ciclos_pagos",
] as const;

export function preserveCheckoutState(row: Record<string, unknown> | null, requested: CheckoutContext["requested"], link: string): CheckoutContext {
  const previous = row?.checkout_context as CheckoutContext | null | undefined;
  const prev = previous?.prev ?? Object.fromEntries(PREVIOUS_FIELDS.filter((k) => row && k in row).map((k) => [k, row?.[k]]));
  return { prev, requested, link };
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