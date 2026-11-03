// Fim do período pago a partir do vencimento da cobrança do Asaas.
// data_vencimento = payment.dueDate + 1 mês de calendário, às 23:59:59.999 de
// Brasília (UTC-3), gravado em UTC. Mês de destino mais curto → último dia
// dele (31/01 → 28/02 ou 29/02). Sem dueDate válido, ou se o resultado não
// estiver no futuro, volta ao comportamento antigo (agora + 30 dias).

const DAY_MS = 24 * 60 * 60 * 1000;
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

const daysInMonth = (year: number, month1to12: number) => new Date(Date.UTC(year, month1to12, 0)).getUTCDate();

export function accessEndFromDueDate(
  dueDate: string | null | undefined,
  now: Date = new Date(),
): { value: string; usedFallback: boolean } {
  const fallback = () => ({ value: new Date(now.getTime() + 30 * DAY_MS).toISOString(), usedFallback: true });
  if (typeof dueDate !== "string") return fallback();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  if (!m) return fallback();
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return fallback();

  const targetYear = month === 12 ? year + 1 : year;
  const targetMonth = month === 12 ? 1 : month + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  // 23:59:59.999 em Brasília = 02:59:59.999 UTC do dia seguinte.
  const ms = Date.UTC(targetYear, targetMonth - 1, targetDay, 23, 59, 59, 999) + BRT_OFFSET_MS;
  if (!(ms > now.getTime())) return fallback();
  return { value: new Date(ms).toISOString(), usedFallback: false };
}
