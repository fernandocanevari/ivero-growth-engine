/**
 * Fonte única da verdade para "qual é o status REAL da assinatura agora".
 *
 * Motivo: `assinaturas.status` é um campo `text` puramente declarativo — ninguém
 * reavaliava `trial_ends_at`, então um trial vencido continuava valendo como
 * `trial` (acesso pago de graça + banner "7 de 7 dias restantes").
 *
 * Este helper deriva o status efetivo na leitura. O cron de normalização
 * (status='expirado') é só higiene de dados: a autoridade é este helper.
 *
 * Nunca reaproveitamos 'cancelado' para trial vencido — são eventos de negócio
 * distintos (cancelamento explícito vs. expiração automática).
 */

export type EffectiveStatus =
  | "sem_assinatura"
  | "ativo"
  | "trial"
  | "trial_expirado"
  | "inadimplente"
  | "cancelado"
  | "pendente"
  | "desconhecido";

export type SubscriptionLike = {
  status?: string | null;
  trial_ends_at?: string | null;
  carencia_ate?: string | null;
  data_vencimento?: string | null;
} | null;

/**
 * Cancelamento não corta o acesso na hora: o cliente mantém o que já pagou.
 * Devolve a data-limite quando o cancelamento ainda tem período pago em aberto,
 * ou null quando o acesso já venceu / não se aplica.
 */
export function cancelAccessUntil(
  row: SubscriptionLike,
  now: Date = new Date(),
): string | null {
  if (!row || row.status !== "cancelado") return null;
  const until = row.data_vencimento ?? null;
  if (!until) return null;
  const ts = new Date(until).getTime();
  if (Number.isNaN(ts) || ts <= now.getTime()) return null;
  return until;
}

/** Rotas de conta: sempre acessíveis, mesmo com trial expirado. */
export const ACCOUNT_ROUTES: readonly string[] = [
  "/dashboard/assinatura",
  "/dashboard/configuracoes",
  "/dashboard/ajuda",
];

export function isAccountRoute(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  return ACCOUNT_ROUTES.includes(path);
}

export function isTrialExpired(
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!trialEndsAt) return false;
  const ts = new Date(trialEndsAt).getTime();
  if (Number.isNaN(ts)) return false;
  return ts <= now.getTime();
}

export function resolveEffectiveStatus(
  row: SubscriptionLike,
  now: Date = new Date(),
): EffectiveStatus {
  if (!row) return "sem_assinatura";

  const status = row.status ?? null;

  // Cron já normalizou → mesmo caminho do trial vencido derivado.
  if (status === "expirado" || status === "trial_expirado") return "trial_expirado";

  if (status === "trial") {
    return isTrialExpired(row.trial_ends_at, now) ? "trial_expirado" : "trial";
  }

  if (status === "ativo") return "ativo";
  if (status === "inadimplente") return "inadimplente";
  if (status === "cancelado") return "cancelado";
  if (status === "pendente") return "pendente";
  return "desconhecido";
}

/** Horas restantes do trial (nunca negativo). */
export function trialHoursLeft(
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!trialEndsAt) return null;
  const ts = new Date(trialEndsAt).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.max(0, (ts - now.getTime()) / 3_600_000);
}

/**
 * Dias inteiros restantes (mín. 1 enquanto houver tempo).
 *
 * Usa `floor`: o dia em curso é parcial e não deve ser contado como cheio —
 * com `ceil`, 6 d 4 h aparecia como "7 de 7" durante quase 24 h e o contador
 * parecia travado no primeiro dia.
 */
export function trialDaysLeft(
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): number | null {
  const hours = trialHoursLeft(trialEndsAt, now);
  if (hours === null) return null;
  if (hours <= 0) return 0;
  return Math.max(1, Math.floor(hours / 24));
}

/** Últimas 48h do trial → estado de urgência (âmbar). */
export function isTrialEndingSoon(
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const hours = trialHoursLeft(trialEndsAt, now);
  return hours !== null && hours > 0 && hours <= 48;
}
