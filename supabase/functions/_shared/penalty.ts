// P26 — multa de fidelidade (cancelamento antecipado do anual) pendente.
// Fonte única da regra "multa bloqueia nova contratação", usada por
// manage-subscription (cancel / pay_penalty), create-checkout (bloqueio) e
// asaas-webhook (quitação / perdão). Espelhada em src/lib/penalty.ts.

import { COMPROMISSO_MESES, descontoMensal, normalizeCiclo } from "./pricing.ts";

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

// ── P26-fix2 — multa = desconto anual realmente usufruído ───────────────────
// Fonte ÚNICA do valor da multa: manage-subscription usa em "cancel" (grava) e
// em "preview_cancel" (só mostra). snapshotDesconto roda na MESMA gravação
// que troca o plano, para que os ciclos pagos no plano antigo continuem
// valendo pelo desconto do plano antigo.

/** Abaixo disso a multa não é gerada (regra já existente do cancelamento). */
export const MULTA_MINIMA = 5;

export type DescontoRow = {
  plano?: string | null;
  ciclo_contratado?: string | null;
  ciclos_pagos?: number | null;
  compromisso_meses?: number | null;
  desconto_acumulado?: number | string | null;
  ciclos_no_upgrade?: number | null;
};

const cents = (v: number) => Math.round(v * 100) / 100;
const compromissoDe = (row: DescontoRow) => Number(row.compromisso_meses ?? COMPROMISSO_MESES);

/**
 * Patch a aplicar junto com a troca de plano (row = linha ANTES da troca).
 * Só contrato anual; mensal → {} (nada muda).
 */
export function snapshotDesconto(row: DescontoRow): { desconto_acumulado: number; ciclos_no_upgrade: number } | Record<string, never> {
  if (normalizeCiclo(row.ciclo_contratado) !== "anual") return {};
  const compromisso = compromissoDe(row);
  const pagos = Math.max(0, Number(row.ciclos_pagos ?? 0));
  const anterior = Math.max(0, Number(row.ciclos_no_upgrade ?? 0));
  const novos = Math.max(0, Math.min(pagos, compromisso) - Math.min(anterior, compromisso));
  const acumulado = Number(row.desconto_acumulado ?? 0) + novos * descontoMensal(String(row.plano ?? ""));
  return { desconto_acumulado: cents(acumulado), ciclos_no_upgrade: pagos };
}

/**
 * Multa do cancelamento antecipado do anual. emCompromisso é a mesma regra de
 * antes: anual, com ao menos 1 ciclo pago e menos ciclos que o compromisso.
 */
export function calcularMultaCancelamento(row: DescontoRow): {
  valor: number;
  ciclos: number;
  emCompromisso: boolean;
  /** Valor calculado > 0 mas abaixo de MULTA_MINIMA (descartado). */
  abaixoDoMinimo: boolean;
} {
  const ciclosPagos = Number(row.ciclos_pagos ?? 0);
  const compromissoMeses = compromissoDe(row);
  const emCompromisso = normalizeCiclo(row.ciclo_contratado) === "anual" && ciclosPagos > 0 && ciclosPagos < compromissoMeses;
  if (!emCompromisso) return { valor: 0, ciclos: 0, emCompromisso, abaixoDoMinimo: false };

  const ciclosTotal = Math.min(ciclosPagos, compromissoMeses);
  const atual = descontoMensal(String(row.plano ?? ""));
  let bruto: number;
  if (row.ciclos_no_upgrade != null) {
    const noUpgrade = Math.max(0, Number(row.ciclos_no_upgrade));
    const antes = Math.min(noUpgrade, ciclosTotal);
    const depois = ciclosTotal - antes;
    const acumulado = Number(row.desconto_acumulado ?? 0);
    // O acumulado cobre min(noUpgrade, compromisso) ciclos; nunca cobra além do compromisso.
    const cobertos = Math.min(noUpgrade, compromissoMeses);
    const valorAntes = cobertos > 0 && antes < cobertos ? (acumulado * antes) / cobertos : acumulado;
    bruto = valorAntes + depois * atual;
  } else {
    bruto = ciclosTotal * atual;
  }
  const valor = cents(Math.max(0, bruto));
  if (valor < MULTA_MINIMA) return { valor: 0, ciclos: ciclosTotal, emCompromisso, abaixoDoMinimo: valor > 0 };
  return { valor, ciclos: ciclosTotal, emCompromisso, abaixoDoMinimo: false };
}
