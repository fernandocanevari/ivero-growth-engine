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

/** Dias de calendário (Brasília) entre hoje e o vencimento do pedido. */
export function upgradeDueChipText(dueDay: string, now = new Date()): string {
  const ddmm = formatDateBR(dueDay).slice(0, 5);
  const today = dayBR(now.toISOString());
  const diff = Math.round((Date.parse(`${dueDay}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (diff < 0) return `Até ${ddmm}`;
  if (diff === 0) return `Vence hoje, ${ddmm}`;
  return `Até ${ddmm} (${diff} ${diff === 1 ? "dia" : "dias"})`;
}

const PLAN_ORDER = ["presenca", "influencia", "autoridade"];
/** Card "Liberar agora": conta ativa com plano escolhido maior e sem upgrade pendente. */
export function showChosenPlanNotice(row: {
  status: string | null | undefined;
  plano: string | null | undefined;
  planoPretendido: string | null | undefined;
  hasUpgradePending: boolean;
}): boolean {
  if (row.status !== "ativo" || row.hasUpgradePending || !row.planoPretendido) return false;
  return PLAN_ORDER.indexOf(row.planoPretendido) > PLAN_ORDER.indexOf(row.plano ?? "");
}
