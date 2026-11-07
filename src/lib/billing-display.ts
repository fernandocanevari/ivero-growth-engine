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