import { formatDateBR } from "@/lib/date-display";

const dayBR = (value: string) => formatDateBR(value, "").split("/").reverse().join("-");

/** Display-only mirror of the paid branch of resumableCancelledAccess. */
export function paidResumeAccessUntil(row: {
  status: string;
  ciclosPagos?: number | null;
  countedPaymentIds?: string[] | null;
  dataVencimento?: string | null;
  multaPendente?: unknown;
}, now = new Date()): string | null {
  if (row.status !== "cancelado" || row.multaPendente) return null;
  if ((row.ciclosPagos ?? 0) <= 0 && !(row.countedPaymentIds?.length)) return null;
  const until = row.dataVencimento;
  if (!until || !Number.isFinite(Date.parse(until)) || Date.parse(until) <= now.getTime()) return null;
  return dayBR(until) > dayBR(now.toISOString()) ? until : null;
}

/** Only the next-charge card uses the scheduled label; all other states stay unchanged. */
export function nextChargeStatusLabel(invoice: { status: string; dueDate: string | null }, fallback: string, now = new Date()): string {
  const dueDay = invoice.dueDate ? dayBR(invoice.dueDate) : "";
  if (invoice.status === "PENDING" && dueDay > dayBR(now.toISOString())) {
    return `Agendada para ${formatDateBR(invoice.dueDate).slice(0, 5)}`;
  }
  return fallback;
}
/**
 * Prazo do pedido de upgrade. Espelha UPGRADE_DUE_DAYS de
 * supabase/functions/manage-subscription/index.ts (vencimento = dia de hoje em
 * Brasília + 3 dias). Só exibição; o servidor é quem cria e expira o pedido.
 */
export const UPGRADE_DUE_DAYS_FRONT = 3;

/** "YYYY-MM-DD" do vencimento do pedido, ou null quando já passou (hoje em Brasília). */
export function upgradePendingDueDay(requestedAt: string | null | undefined, now = new Date()): string | null {
  if (!requestedAt || !Number.isFinite(Date.parse(requestedAt))) return null;
  const start = dayBR(requestedAt);
  const due = new Date(Date.parse(`${start}T00:00:00Z`) + UPGRADE_DUE_DAYS_FRONT * 86_400_000).toISOString().slice(0, 10);
  return due >= dayBR(now.toISOString()) ? due : null;
}
