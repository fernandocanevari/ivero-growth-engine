/**
 * Textos da mensalidade vencida (tolerância de 3 dias e acesso pausado).
 * Datas sempre em DD/MM no horário de Brasília.
 */
import { formatBRL } from "@/lib/pricing-rules";

/** DD/MM em Brasília. dueDate "YYYY-MM-DD" do Asaas é data civil (sem fuso). */
export function ddmm(value: string | null | undefined): string {
  if (!value) return "—";
  const civil = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (civil) return `${civil[3]}/${civil[2]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
}

/** Primeiro dia sem acesso: o dia seguinte ao fim da tolerância. */
export function pausedSince(carenciaAte: string | null | undefined): string {
  if (!carenciaAte) return "—";
  const t = new Date(carenciaAte).getTime();
  if (Number.isNaN(t)) return "—";
  return ddmm(new Date(t + 1).toISOString());
}

export function overdueGraceText(value: number, dueDate: string | null, carenciaAte: string | null): string {
  return `Não conseguimos cobrar sua mensalidade de ${formatBRL(value)}, que venceu em ${ddmm(dueDate)}. Seu acesso continua normal até ${ddmm(carenciaAte)}. Atualize o pagamento agora para não ter interrupção.`;
}

export function overdueBlockedText(value: number, carenciaAte: string | null): string {
  return `Seu acesso está pausado desde ${pausedSince(carenciaAte)} porque a mensalidade de ${formatBRL(value)} não foi paga. Pague agora e tudo volta ao normal na hora.`;
}

export function overdueNextChargeText(value: number, dueDate: string | null): string {
  return `Mensalidade vencida em ${ddmm(dueDate)} · ${formatBRL(value)}`;
}

export const PAY_NOW_LABEL = "Pagar agora";
export const PAYMENT_PENDING_BADGE = "Pagamento pendente";
