// P26 — cobrança da multa de fidelidade ("fidelidade:<assinatura>[:<plano>]").
// Paga ou removida (perdão do fundador) → limpa multa_pendente_* e libera a
// recontratação. Vencida → só log: nunca muda status, carência nem acesso.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { CLEAR_PENALTY } from "../_shared/penalty.ts";

export const FIDELIDADE_REF_RE = /^fidelidade:([0-9a-f-]{36})(?::(presenca|influencia|autoridade))?$/;

const PAID_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const REFUND_EVENTS = new Set([
  "PAYMENT_REFUNDED",
  "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_REFUND_IN_PROGRESS",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
  "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
]);
/** Eventos tratados aqui; os demais (CREATED, UPDATED...) seguem como avulsa comum. */
export const FIDELIDADE_EVENTS = new Set([...PAID_EVENTS, "PAYMENT_DELETED", "PAYMENT_OVERDUE", ...REFUND_EVENTS]);

export function parseFidelidadeRef(ref: unknown): { assinaturaId: string; plano: string | null } | null {
  if (typeof ref !== "string") return null;
  const m = ref.match(FIDELIDADE_REF_RE);
  return m ? { assinaturaId: m[1], plano: m[2] ?? null } : null;
}

type Row = {
  id: string;
  multa_pendente_payment_id: string | null;
  multa_ultimo_payment_id: string | null;
};

export type FidelidadeResult = { status: number; body: Record<string, unknown> };

const IGNORED: FidelidadeResult = { status: 200, body: { received: true, ignored: "one_off" } };

/** Erro de dado/esquema (22xxx, 23xxx, 42xxx, PGRST2xx): reenviar não resolve. */
export function isPermanentDbError(err: { code?: string | null } | null | undefined): boolean {
  const code = String(err?.code ?? "");
  return /^(22|23|42)/.test(code) || /^PGRST2/.test(code);
}

export async function handleFidelidadePayment(
  supabase: SupabaseClient,
  event: string,
  paymentId: string,
  ref: { assinaturaId: string },
): Promise<FidelidadeResult> {
  if (REFUND_EVENTS.has(event)) {
    console.error("ALERTA multa estornada", ref.assinaturaId, paymentId, event);
    return { status: 200, body: { received: true, ignored: "multa_estornada" } };
  }
  if (!paymentId) {
    console.error("ALERTA multa sem payment.id", ref.assinaturaId, event);
    return IGNORED;
  }

  const dbFailure = (step: string, err: { code?: string | null; message: string }): FidelidadeResult => {
    if (isPermanentDbError(err)) {
      console.error("ALERTA multa não tratada", step, ref.assinaturaId, paymentId, err.code ?? "", err.message);
      return { status: 200, body: { received: true, ignored: "multa_not_applied" } };
    }
    console.error("[asaas-webhook] multa: erro transitório", step, ref.assinaturaId, err.message);
    return { status: 500, body: { error: err.message } };
  };

  const { data, error } = await supabase.from("assinaturas")
    .select("id, multa_pendente_payment_id, multa_ultimo_payment_id")
    .eq("id", ref.assinaturaId).maybeSingle();
  if (error) return dbFailure("leitura", error);
  const row = data as Row | null;

  if (row && row.multa_ultimo_payment_id === paymentId && row.multa_pendente_payment_id !== paymentId) {
    console.log("multa já tratada", paymentId, event);
    return IGNORED;
  }
  if (!row || !row.multa_pendente_payment_id) {
    console.log("multa sem registro, ignorada", event, paymentId, ref.assinaturaId);
    return IGNORED;
  }
  if (row.multa_pendente_payment_id !== paymentId) {
    if (PAID_EVENTS.has(event)) console.error("ALERTA multa paga sem pendência correspondente", paymentId, ref.assinaturaId);
    else console.log("multa sem registro, ignorada", event, paymentId, ref.assinaturaId);
    return IGNORED;
  }

  if (event === "PAYMENT_OVERDUE") {
    console.log("multa vencida, bloqueio mantido", row.id, paymentId);
    return { status: 200, body: { received: true, multa: "overdue" } };
  }

  // CONFIRMED / RECEIVED (paga) ou DELETED (perdoada): limpa numa instrução condicional.
  const { data: cleared, error: clearError } = await supabase.from("assinaturas")
    .update({ ...CLEAR_PENALTY, multa_ultimo_payment_id: paymentId })
    .eq("id", row.id).eq("multa_pendente_payment_id", paymentId).select("id");
  if (clearError) return dbFailure("limpeza", clearError);
  if (!cleared || cleared.length === 0) {
    console.log("multa já tratada", paymentId, event);
    return IGNORED;
  }
  const outcome = event === "PAYMENT_DELETED" ? "forgiven" : "paid";
  console.log(outcome === "paid" ? "multa paga" : "multa perdoada", row.id, paymentId);
  return { status: 200, body: { received: true, multa: outcome } };
}
