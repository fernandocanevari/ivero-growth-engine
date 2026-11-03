/**
 * Exibição de datas de acesso/cobrança como DD/MM/AAAA no horário de Brasília,
 * independente do fuso do navegador.
 * - Timestamp (ex.: "2026-12-11T02:59:59.999Z") → dia civil em America/Sao_Paulo.
 * - Data civil "YYYY-MM-DD" do Asaas (ex.: dueDate) → mostrada como está, sem fuso.
 */
const SP_DATE = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDateBR(value: string | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const civil = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (civil) {
    const [, y, m, d] = civil;
    const check = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (check.getUTCFullYear() !== Number(y) || check.getUTCMonth() !== Number(m) - 1 || check.getUTCDate() !== Number(d)) {
      return fallback;
    }
    return `${d}/${m}/${y}`;
  }
  const t = new Date(value);
  if (Number.isNaN(t.getTime())) return fallback;
  return SP_DATE.format(t);
}
