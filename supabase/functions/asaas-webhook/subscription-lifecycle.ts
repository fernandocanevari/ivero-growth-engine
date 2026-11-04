// Decisões puras do asaas-webhook para o ciclo de vida da assinatura (testáveis).
import type { CheckoutContext } from "../_shared/checkout-state.ts";

const LIVE_STATUSES = ["ativo", "trial", "inadimplente", "atrasado", "pendente"];

/**
 * Cartão registrado (CHECKOUT_PAID / SUBSCRIPTION_CREATED) numa retomada de
 * teste cancelado: a linha volta a 'trial' com o MESMO trial_ends_at original
 * (gravado por create-checkout em checkout_context.resumeTrialEndsAt). Qualquer
 * outra linha não muda de status aqui.
 */
export function resumeTrialPatch(
  row: { status?: string | null; checkout_context?: CheckoutContext | null },
  now = new Date(),
): Record<string, unknown> {
  const end = row.checkout_context?.resumeTrialEndsAt;
  if (row.status !== "cancelado" || !end) return {};
  const endMs = Date.parse(end);
  if (Number.isNaN(endMs) || endMs <= now.getTime()) return {};
  return { status: "trial", trial_ends_at: end, carencia_ate: null };
}

/**
 * Retomada de assinatura PAGA cancelada (marca checkout_context.resumePaidUntil,
 * gravada por create-checkout): cartão registrado → novo contrato de 12 meses.
 * Vincula (os ids vêm do chamador), status 'ativo', contagem zerada, plano e
 * ciclo_contratado mantidos (o escolhido segue em plano/ciclo_pretendido e só
 * vale na 1ª cobrança, via claim_subscription_payment), data_vencimento
 * intacta e a marca é APAGADA na mesma gravação — evento repetido não zera de
 * novo. O chamador grava condicionado à marca ainda presente.
 * Retorna null quando a linha não é uma retomada paga em andamento.
 */
export function resumeSubscriptionPatch(
  row: { status?: string | null; checkout_context?: CheckoutContext | null },
): Record<string, unknown> | null {
  const ctx = row.checkout_context;
  if (row.status !== "cancelado" || !ctx?.resumePaidUntil) return null;
  const { resumePaidUntil: _consumed, ...rest } = ctx;
  return {
    status: "ativo",
    carencia_ate: null,
    ciclos_pagos: 0,
    compromisso_inicio: null,
    desconto_acumulado: null,
    ciclos_no_upgrade: null,
    checkout_context: rest,
  };
}

/**
 * SUBSCRIPTION_DELETED / SUBSCRIPTION_INACTIVATED.
 * Só age sobre a linha que AINDA está vinculada exatamente a essa assinatura
 * (nunca casa por checkout/externalReference e nunca grava o id removido).
 * - Linha cancelada (ex.: cancelamento pelo app, que já limpou ou deveria ter
 *   limpo o vínculo): só zera o vínculo; status e data_vencimento intactos.
 * - Linha viva vinculada (ex.: assinatura removida pelo dono no painel do
 *   Asaas): passa a 'cancelado' como antes, sem mexer em data_vencimento —
 *   o acesso segue até a data já gravada — e o vínculo é zerado.
 * Retorna null quando não há nada a fazer.
 */
export function subscriptionRemovalPatch(
  row: { status?: string | null; asaas_subscription_id?: string | null } | null,
  removedId: string,
): Record<string, unknown> | null {
  if (!row || !removedId || row.asaas_subscription_id !== removedId) return null;
  const unlink = { asaas_subscription_id: null, asaas_subscription_id_anterior: removedId };
  return LIVE_STATUSES.includes(row.status ?? "")
    ? { ...unlink, status: "cancelado", carencia_ate: null }
    : unlink;
}

/** Dias de tolerância após o vencimento da mensalidade (decisão do fundador). */
export const OVERDUE_GRACE_DAYS = 3;

/**
 * Fim da tolerância: dueDate (YYYY-MM-DD) + 3 dias, às 23:59:59.999 em
 * Brasília (UTC-3, sem horário de verão), devolvido em UTC.
 * Ex.: vencimento 10/10 → 13/10 23:59:59.999 BRT = 14/10 02:59:59.999Z.
 * Sem dueDate válido usa o dia de hoje em Brasília.
 */
export function graceEndFromDueDate(dueDate: string | null | undefined, now = new Date()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dueDate ?? "");
  const base = m ? m : /^(\d{4})-(\d{2})-(\d{2})/.exec(now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }))!;
  const [y, mo, d] = [Number(base[1]), Number(base[2]) - 1, Number(base[3])];
  return new Date(Date.UTC(y, mo, d + OVERDUE_GRACE_DAYS, 23 + 3, 59, 59, 999)).toISOString();
}

/**
 * PAYMENT_OVERDUE de mensalidade: 'inadimplente' com tolerância contada do
 * vencimento. Reenvio do evento nunca estende uma carência já gravada.
 */
export function overduePatch(
  row: { carencia_ate?: string | null },
  dueDate: string | null | undefined,
  now = new Date(),
): Record<string, unknown> {
  if (row.carencia_ate) return { status: "inadimplente" };
  return { status: "inadimplente", carencia_ate: graceEndFromDueDate(dueDate, now) };
}
