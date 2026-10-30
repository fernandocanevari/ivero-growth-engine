// P26 — ação pay_penalty: devolve (ou cria) a cobrança da multa de fidelidade.
// Toda situação de negócio responde HTTP 200 com ok:true/ok:false.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { prorationDay } from "../_shared/proration.ts";
import {
  CLEAR_PENALTY,
  isPenaltyPending,
  PENALTY_COLUMNS,
  PENALTY_UNAVAILABLE_MESSAGE,
  penaltyDescription,
  penaltyRef,
  type PenaltyRow,
} from "../_shared/penalty.ts";

export type FetchAsaas = (path: string, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json: Record<string, any> | null;
  text: string;
}>;

/** Reserva sem cobrança gravada vale por 60s (duplo clique / pedidos simultâneos). */
export const PENALTY_RESERVA_MS = 60_000;
export const PENALTY_IN_PROGRESS_MESSAGE = "Já estamos abrindo a cobrança da multa. Tente de novo em instantes.";
export const PENALTY_IN_ANALYSIS_MESSAGE =
  "Recebemos o pagamento da multa e ele está em análise. Assim que for confirmado, a pendência sai daqui.";

const PAID = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
const OPEN = ["PENDING", "OVERDUE"];

type Row = PenaltyRow & { id: string; plano: string | null; asaas_customer_id: string | null };

export async function handlePayPenalty(args: {
  db: SupabaseClient;
  userId: string;
  fetchAsaas: FetchAsaas;
  hasKey: boolean;
  now?: Date;
}): Promise<Record<string, unknown>> {
  const { db, userId, fetchAsaas, hasKey } = args;
  const now = args.now ?? new Date();
  const unavailable = (why: string) => {
    console.error("pay_penalty: cobrança indisponível", userId, why);
    return { ok: false, reason: "cobranca_indisponivel", message: PENALTY_UNAVAILABLE_MESSAGE };
  };

  const { data: rows, error } = await db
    .from("assinaturas")
    .select(`id, plano, asaas_customer_id, ${PENALTY_COLUMNS}`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return unavailable(`db: ${error.message}`);
  const row = ((rows ?? []) as Row[]).find(isPenaltyPending);
  if (!row) return { ok: true, nothing_pending: true };
  const valor = Number(row.multa_pendente_valor);
  if (!hasKey) return unavailable("chave do Asaas ausente");

  const clear = async (pid: string) => {
    const { error: clrErr } = await db
      .from("assinaturas")
      .update({ ...CLEAR_PENALTY, multa_ultimo_payment_id: pid })
      .eq("id", row.id)
      .eq("multa_pendente_payment_id", pid);
    return clrErr;
  };

  // 1) Cobrança já criada: consulta o estado atual no Asaas.
  const pid = row.multa_pendente_payment_id ?? null;
  if (pid) {
    let look: Awaited<ReturnType<FetchAsaas>>;
    try {
      look = await fetchAsaas(`/payments/${encodeURIComponent(pid)}`);
    } catch (err) {
      return unavailable(`GET /payments erro: ${err instanceof Error ? err.message : String(err)}`);
    }
    const gone = look.status === 404 || (look.ok && look.json?.deleted === true);
    if (!look.ok && !gone) return unavailable(`GET /payments http ${look.status}`);
    const st = String(look.json?.status ?? "").toUpperCase();

    if (gone || PAID.includes(st)) {
      const clrErr = await clear(pid);
      if (clrErr) return unavailable(`db clear: ${clrErr.message}`);
      console.log("pay_penalty:", gone ? "multa perdoada (cobrança removida)" : "multa paga", row.id, pid);
      return gone ? { ok: true, forgiven: true } : { ok: true, paid: true };
    }
    if (OPEN.includes(st)) {
      const url = (look.json?.invoiceUrl as string | undefined) ?? null;
      if (!url) return unavailable(`cobrança ${st} sem invoiceUrl`);
      if (url !== (row.multa_pendente_invoice_url ?? null)) {
        const { error: urlErr } = await db
          .from("assinaturas")
          .update({ multa_pendente_invoice_url: url })
          .eq("id", row.id)
          .eq("multa_pendente_payment_id", pid);
        if (urlErr) console.error("pay_penalty: link da multa não atualizado", row.id, urlErr.message);
      }
      return { ok: true, invoiceUrl: url, valor, status: st };
    }
    if (st === "AWAITING_RISK_ANALYSIS") {
      return { ok: false, reason: "pagamento_em_analise", message: PENALTY_IN_ANALYSIS_MESSAGE };
    }
    console.error("ALERTA multa em estado inesperado", row.id, pid, st);
    return unavailable(`status ${st}`);
  }

  // 2) Cobrança não criada no cancelamento: cria agora, uma vez só.
  const customerId = row.asaas_customer_id ?? null;
  if (!customerId) return unavailable("sem cliente no Asaas");

  const reservedAt = now.toISOString();
  const cutoff = new Date(now.getTime() - PENALTY_RESERVA_MS).toISOString();
  const { data: reserved, error: reserveErr } = await db
    .from("assinaturas")
    .update({ multa_pendente_em: reservedAt })
    .eq("id", row.id)
    .is("multa_pendente_payment_id", null)
    .or(`multa_pendente_em.is.null,multa_pendente_em.lt."${cutoff}"`)
    .select("id");
  if (reserveErr) return unavailable(`db reserva: ${reserveErr.message}`);
  if (!reserved || reserved.length === 0) {
    return { ok: false, reason: "pedido_em_andamento", message: PENALTY_IN_PROGRESS_MESSAGE };
  }
  const release = async () => {
    const { error: relErr } = await db
      .from("assinaturas")
      .update({ multa_pendente_em: null })
      .eq("id", row.id)
      .eq("multa_pendente_em", reservedAt)
      .is("multa_pendente_payment_id", null);
    if (relErr) console.error("pay_penalty: reserva não liberada", row.id, relErr.message);
  };

  let charge: Awaited<ReturnType<FetchAsaas>> | null = null;
  try {
    charge = await fetchAsaas(`/payments`, {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "CREDIT_CARD",
        value: valor,
        dueDate: prorationDay(now) ?? now.toISOString().slice(0, 10),
        description: penaltyDescription(row.plano, Number(row.multa_pendente_ciclos ?? 0)),
        externalReference: penaltyRef(row.id, row.plano),
      }),
    });
  } catch (err) {
    console.error("pay_penalty: POST /payments erro", row.id, err instanceof Error ? err.message : String(err));
    charge = null;
  }
  const chargeId = charge?.ok ? String(charge.json?.id ?? "") : "";
  if (!charge || !charge.ok || !chargeId) {
    await release();
    return unavailable(`POST /payments http ${charge?.status ?? "network"}`);
  }
  const invoiceUrl = (charge.json?.invoiceUrl as string | undefined) ?? null;

  const { data: saved, error: saveErr } = await db
    .from("assinaturas")
    .update({ multa_pendente_payment_id: chargeId, multa_pendente_invoice_url: invoiceUrl, multa_pendente_em: reservedAt })
    .eq("id", row.id)
    .eq("multa_pendente_em", reservedAt)
    .is("multa_pendente_payment_id", null)
    .select("id");
  if (saveErr || !saved || saved.length === 0) {
    try {
      const undo = await fetchAsaas(`/payments/${encodeURIComponent(chargeId)}`, { method: "DELETE" });
      if (!undo.ok && undo.status !== 404) console.error("ALERTA multa órfã não removida", row.id, chargeId, undo.status);
    } catch (err) {
      console.error("ALERTA multa órfã não removida", row.id, chargeId, err instanceof Error ? err.message : String(err));
    }
    await release();
    return unavailable(`db save: ${saveErr?.message ?? "0 linhas"}`);
  }
  if (!invoiceUrl) return unavailable("cobrança criada sem invoiceUrl");
  console.log("pay_penalty: cobrança da multa criada", row.id, chargeId, valor);
  return { ok: true, invoiceUrl, valor, created: true };
}
