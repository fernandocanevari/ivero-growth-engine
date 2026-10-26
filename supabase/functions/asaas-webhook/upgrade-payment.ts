// P25a — cobrança da diferença de upgrade individual ("prorata:<assinatura>:<plano>").
// O plano novo só vale depois que ESTA cobrança é paga. Dormente até alguém
// gravar as colunas upgrade_pendente_* (nada grava ainda).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { asaasApiKey, asaasBaseUrl } from "../_shared/asaas.ts";

// Referências de agência ("prorata:<id>:agency:<marca>") e de fidelidade não casam.
export const UPGRADE_REF_RE = /^prorata:([0-9a-f-]{36}):(presenca|influencia|autoridade)(?::\d+)?$/;

export const UPGRADE_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_DELETED"]);

export function parseUpgradeRef(ref: unknown): { assinaturaId: string; plano: string } | null {
  if (typeof ref !== "string") return null;
  const m = ref.match(UPGRADE_REF_RE);
  return m ? { assinaturaId: m[1], plano: m[2] } : null;
}

const CLEAR_PENDING = {
  upgrade_pendente_plano: null,
  upgrade_pendente_ciclo: null,
  upgrade_pendente_valor_novo: null,
  upgrade_pendente_diferenca: null,
  upgrade_pendente_payment_id: null,
  upgrade_pendente_invoice_url: null,
  upgrade_pendente_em: null,
};

type PendingRow = {
  id: string;
  asaas_subscription_id: string | null;
  upgrade_pendente_plano: string | null;
  upgrade_pendente_ciclo: string | null;
  upgrade_pendente_valor_novo: number | string | null;
  upgrade_pendente_payment_id: string | null;
};

export type UpgradeResult = { status: number; body: Record<string, unknown> };

export async function handleUpgradePayment(
  supabase: SupabaseClient,
  event: string,
  paymentId: string,
  ref: { assinaturaId: string; plano: string },
): Promise<UpgradeResult> {
  const { data, error } = await supabase.from("assinaturas")
    .select("id, asaas_subscription_id, upgrade_pendente_plano, upgrade_pendente_ciclo, upgrade_pendente_valor_novo, upgrade_pendente_payment_id")
    .eq("id", ref.assinaturaId).maybeSingle();
  if (error) {
    console.error("[asaas-webhook] upgrade: erro ao ler assinatura", ref.assinaturaId, error.message);
    return { status: 500, body: { error: error.message } };
  }
  const row = data as PendingRow | null;
  const matches = !!row && !!paymentId && !!row.upgrade_pendente_payment_id && row.upgrade_pendente_payment_id === paymentId;

  if (!matches) {
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      console.warn("ALERTA: pagamento de upgrade sem pendência correspondente", paymentId, ref.assinaturaId);
    } else {
      console.log("[asaas-webhook] upgrade sem pendência correspondente, ignorado:", event, paymentId, ref.assinaturaId);
    }
    // Mesma resposta de hoje para cobrança avulsa.
    return { status: 200, body: { received: true, ignored: "one_off" } };
  }

  const pending = row as PendingRow;

  if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
    // (1) PRIMEIRO o novo valor no Asaas; falhou → 500 sem tocar no banco (Asaas reenvia).
    const key = asaasApiKey();
    const valor = pending.upgrade_pendente_valor_novo == null ? NaN : Number(pending.upgrade_pendente_valor_novo);
    if (!key || !pending.asaas_subscription_id || !Number.isFinite(valor)) {
      console.error("[asaas-webhook] upgrade: não foi possível atualizar o valor no Asaas", pending.id, JSON.stringify({ temChave: !!key, temAssinatura: !!pending.asaas_subscription_id, valor: pending.upgrade_pendente_valor_novo }));
      return { status: 500, body: { error: "upgrade_put_unavailable" } };
    }
    try {
      const res = await fetch(`${asaasBaseUrl()}/subscriptions/${encodeURIComponent(pending.asaas_subscription_id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", access_token: key },
        body: JSON.stringify({ value: valor, updatePendingPayments: true, description: `Ivero — Plano ${pending.upgrade_pendente_plano}` }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[asaas-webhook] upgrade: PUT /subscriptions falhou", res.status, pending.id, text.slice(0, 300));
        return { status: 500, body: { error: "upgrade_put_failed" } };
      }
      await res.body?.cancel().catch(() => {});
    } catch (err) {
      console.error("[asaas-webhook] upgrade: PUT /subscriptions erro", pending.id, (err as Error).message);
      return { status: 500, body: { error: "upgrade_put_failed" } };
    }

    // (2) DEPOIS promove numa única instrução condicional.
    const patch: Record<string, unknown> = { plano: pending.upgrade_pendente_plano, ...CLEAR_PENDING };
    if (pending.upgrade_pendente_ciclo) patch.ciclo_contratado = pending.upgrade_pendente_ciclo;
    const { data: updated, error: upError } = await supabase.from("assinaturas").update(patch)
      .eq("id", pending.id).eq("upgrade_pendente_payment_id", paymentId).select("id");
    if (upError) {
      console.error("[asaas-webhook] upgrade: erro ao promover plano", pending.id, upError.message);
      return { status: 500, body: { error: upError.message } };
    }
    if (!updated || updated.length === 0) {
      console.log("[asaas-webhook] upgrade já processado, nada muda:", event, paymentId, pending.id);
      return { status: 200, body: { received: true, ignored: "upgrade_already_applied" } };
    }
    console.log("[asaas-webhook] upgrade promovido:", pending.id, pending.upgrade_pendente_plano, pending.upgrade_pendente_ciclo ?? "(ciclo mantido)", paymentId);
    return { status: 200, body: { received: true, upgrade: "applied" } };
  }

  // PAYMENT_OVERDUE / PAYMENT_DELETED: o pedido de upgrade expirou.
  if (event === "PAYMENT_OVERDUE") {
    const key = asaasApiKey();
    if (!key) {
      console.error("[asaas-webhook] upgrade expirado: chave do Asaas ausente, cobrança não removida", paymentId);
    } else {
      try {
        const res = await fetch(`${asaasBaseUrl()}/payments/${encodeURIComponent(paymentId)}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", access_token: key },
        });
        if (!res.ok && res.status !== 404) {
          const text = await res.text().catch(() => "");
          console.error("[asaas-webhook] upgrade expirado: DELETE /payments falhou", res.status, paymentId, text.slice(0, 300));
        } else {
          await res.body?.cancel().catch(() => {});
        }
      } catch (err) {
        console.error("[asaas-webhook] upgrade expirado: DELETE /payments erro", paymentId, (err as Error).message);
      }
    }
  }
  const { error: clearError } = await supabase.from("assinaturas").update(CLEAR_PENDING)
    .eq("id", pending.id).eq("upgrade_pendente_payment_id", paymentId);
  if (clearError) {
    console.error("[asaas-webhook] upgrade expirado: erro ao limpar pendência", pending.id, clearError.message);
    return { status: 500, body: { error: clearError.message } };
  }
  console.log("upgrade expirado", pending.id, pending.upgrade_pendente_plano);
  return { status: 200, body: { received: true, upgrade: "expired" } };
}
