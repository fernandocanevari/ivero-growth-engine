// P26 — multa de fidelidade (cancelamento antecipado do anual) pendente.
// Fonte única da regra "multa bloqueia nova contratação", usada por
// manage-subscription (cancel / pay_penalty), create-checkout (bloqueio) e
// asaas-webhook (quitação / perdão). Espelhada em src/lib/penalty.ts.

/** Colunas da multa pendente em public.assinaturas. */
export const PENALTY_COLUMNS =
  "multa_pendente_valor, multa_pendente_ciclos, multa_pendente_payment_id, multa_pendente_invoice_url, multa_pendente_em, multa_ultimo_payment_id";

/** Limpa a pendência (paga ou perdoada). Sempre junto com multa_ultimo_payment_id. */
export const CLEAR_PENALTY = {
  multa_pendente_valor: null,
  multa_pendente_ciclos: null,
  multa_pendente_payment_id: null,
  multa_pendente_invoice_url: null,
  multa_pendente_em: null,
};

export type PenaltyRow = {
  multa_pendente_valor?: number | string | null;
  multa_pendente_ciclos?: number | null;
  multa_pendente_payment_id?: string | null;
  multa_pendente_invoice_url?: string | null;
  multa_pendente_em?: string | null;
  multa_ultimo_payment_id?: string | null;
};

/**
 * Multa ainda em aberto? Valor > 0 e a cobrança gravada não é a última tratada
 * (ou ainda não foi criada). Linhas antigas, com as colunas vazias, nunca
 * bloqueiam.
 */
export function isPenaltyPending(row: PenaltyRow | null | undefined): boolean {
  if (!row) return false;
  const valor = row.multa_pendente_valor == null ? NaN : Number(row.multa_pendente_valor);
  if (!Number.isFinite(valor) || valor <= 0) return false;
  const pid = row.multa_pendente_payment_id ?? null;
  return pid === null || pid !== (row.multa_ultimo_payment_id ?? null);
}

/** externalReference da cobrança da multa (o webhook reconhece por ela). */
export const penaltyRef = (assinaturaId: string, plano: string | null | undefined) =>
  `fidelidade:${assinaturaId}:${plano ?? ""}`.replace(/:$/, "");

export const penaltyDescription = (plano: string | null | undefined, ciclos: number) =>
  `Ivero — diferença de fidelidade (plano ${plano ?? "—"}, ${ciclos} mês(es) com desconto anual)`;

/** "R$ 1.234,50" */
export const formatPenaltyBRL = (valor: number) =>
  `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PENALTY_UNAVAILABLE_MESSAGE = "Não conseguimos abrir a cobrança agora. Tente de novo em instantes.";

export const penaltyBlockedMessage = (valor: number) =>
  `Antes de assinar de novo, falta pagar a multa do cancelamento anterior: ${formatPenaltyBRL(valor)}.`;
