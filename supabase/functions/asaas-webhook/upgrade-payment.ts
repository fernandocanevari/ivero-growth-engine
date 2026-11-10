// P25a — cobrança da diferença de upgrade individual ("prorata:<assinatura>:<plano>").
// O plano novo só vale depois que ESTA cobrança é paga. Dormente até alguém
// gravar as colunas upgrade_pendente_* (nada grava ainda).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { asaasApiKey, asaasBaseUrl } from "../_shared/asaas.ts";
import { snapshotDesconto, type DescontoRow } from "../_shared/penalty.ts";

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

// Ordem dos planos (mesma de _shared/agency-pricing.ts).
const PLAN_RANK: Record<string, number> = { presenca: 1, influencia: 2, autoridade: 3 };

type PendingRow = DescontoRow & {
  id: string;
  plano_pretendido?: string | null;
  asaas_subscription_id: string | null;
  upgrade_pendente_plano: string | null;
  upgrade_pendente_ciclo: string | null;
  upgrade_pendente_valor_novo: number | string | null;
  upgrade_pendente_payment_id: string | null;
  upgrade_ultimo_payment_id: string | null;
};

export type UpgradeResult = { status: number; body: Record<string, unknown> };

export async function handleUpgradePayment(
  supabase: SupabaseClient,
  event: string,
  paymentId: string,
  ref: { assinaturaId: string; plano: string },
): Promise<UpgradeResult> {
  const { data, error } = await supabase.from("assinaturas")
    .select("id, asaas_subscription_id, upgrade_pendente_plano, upgrade_pendente_ciclo, upgrade_pendente_valor_novo, upgrade_pendente_payment_id, upgrade_ultimo_payment_id, plano, plano_pretendido, ciclo_contratado, ciclos_pagos, compromisso_meses, desconto_acumulado, ciclos_no_upgrade")
    .eq("id", ref.assinaturaId).maybeSingle();
  if (error) {
    console.error("[asaas-webhook] upgrade: erro ao ler assinatura", ref.assinaturaId, error.message);
    return { status: 500, body: { error: error.message } };
  }
  const row = data as PendingRow | null;
  const matches = !!row && !!paymentId && !!row.upgrade_pendente_payment_id && row.upgrade_pendente_payment_id === paymentId;

  if (!matches) {
    if (row && paymentId && row.upgrade_ultimo_payment_id === paymentId) {
      console.log("upgrade já tratado", paymentId, event);
    } else if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
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
    // Falha PERMANENTE (dado/configuração): 200 sem mudar nada, para nunca
    // travar a fila de webhooks do Asaas com reenvios que não vão funcionar.
    const permanent = (reason: string): UpgradeResult => {
      console.error("ALERTA upgrade pago sem promoção:", pending.id, paymentId, reason);
      return { status: 200, body: { received: true, ignored: "upgrade_not_applied" } };
    };
    // Rede de segurança: o plano já foi liberado (igual ou maior) antes deste
    // pagamento chegar. Não promove nem altera o Asaas; limpa a pendência e
    // registra para estorno manual. Nunca 500.
    const atual = PLAN_RANK[String(pending.plano ?? "")] ?? 0;
    const pedido = PLAN_RANK[String(pending.upgrade_pendente_plano ?? "")] ?? 0;
    if (atual > 0 && pedido > 0 && atual >= pedido) {
      console.error("ALERTA upgrade: pago depois do plano já liberado", pending.id, paymentId);
      const { error: clrErr } = await supabase.from("assinaturas").update({ ...CLEAR_PENDING, upgrade_ultimo_payment_id: paymentId })
        .eq("id", pending.id).eq("upgrade_pendente_payment_id", paymentId);
      if (clrErr) console.error("ALERTA upgrade: pendência não limpa", pending.id, paymentId, clrErr.message);
      return { status: 200, body: { received: true, ignored: "upgrade_plan_already_held" } };
    }
    if (!pending.asaas_subscription_id) return permanent("assinatura_sem_asaas_subscription_id");
    if (!Number.isFinite(valor)) return permanent("sem_upgrade_pendente_valor_novo");
    if (!key) return permanent("chave_asaas_ausente");
    // Assinatura no Asaas já com o valor novo (ex.: reativação com plano
    // maior): não envia o PUT. Leitura falhou → segue com o PUT, como antes.
    let skipPut = false;
    try {
      const cur = await fetch(`${asaasBaseUrl()}/subscriptions/${encodeURIComponent(pending.asaas_subscription_id)}`, {
        headers: { "Content-Type": "application/json", access_token: key },
      });
      if (cur.ok) {
        const curJson = await cur.json().catch(() => null) as { value?: unknown } | null;
        skipPut = curJson?.value != null && Number(curJson.value) === valor;
      } else {
        await cur.body?.cancel().catch(() => {});
      }
    } catch { skipPut = false; }
    if (skipPut) console.log("[asaas-webhook] upgrade: valor do Asaas já igual ao novo, PUT não enviado", pending.id, valor);
    if (!skipPut) try {
      const res = await fetch(`${asaasBaseUrl()}/subscriptions/${encodeURIComponent(pending.asaas_subscription_id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", access_token: key },
        body: JSON.stringify({ value: valor, updatePendingPayments: true, description: `Ivero — Plano ${pending.upgrade_pendente_plano}` }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) return permanent(`asaas_put_http_${res.status}: ${text.slice(0, 300)}`);
        console.error("[asaas-webhook] upgrade: PUT /subscriptions falhou", res.status, pending.id, text.slice(0, 300));
        return { status: 500, body: { error: "upgrade_put_failed" } };
      }
      await res.body?.cancel().catch(() => {});
    } catch (err) {
      console.error("[asaas-webhook] upgrade: PUT /subscriptions erro", pending.id, (err as Error).message);
      return { status: 500, body: { error: "upgrade_put_failed" } };
    }

    // (2) DEPOIS promove numa única instrução condicional. P26-fix2: o desconto
    // dos ciclos já pagos fica registrado com o plano ANTIGO na mesma gravação;
    // reenvio do mesmo pagamento não casa (pendência já limpa) e não soma de novo.
    const patch: Record<string, unknown> = { plano: pending.upgrade_pendente_plano, ...CLEAR_PENDING, upgrade_ultimo_payment_id: paymentId, ...snapshotDesconto(pending) };
    if (pending.upgrade_pendente_ciclo) patch.ciclo_contratado = pending.upgrade_pendente_ciclo;
    if (pending.plano_pretendido && pending.plano_pretendido === pending.upgrade_pendente_plano) {
      patch.plano_pretendido = null;
      patch.ciclo_pretendido = null;
    }
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
  const { error: clearError } = await supabase.from("assinaturas").update({ ...CLEAR_PENDING, upgrade_ultimo_payment_id: paymentId })
    .eq("id", pending.id).eq("upgrade_pendente_payment_id", paymentId);
  if (clearError) {
    console.error("[asaas-webhook] upgrade expirado: erro ao limpar pendência", pending.id, clearError.message);
    return { status: 500, body: { error: clearError.message } };
  }
  console.log("upgrade expirado", pending.id, pending.upgrade_pendente_plano);
  return { status: 200, body: { received: true, upgrade: "expired" } };
}

/**
 * Mensalidade recorrente confirmada (já contada por claim_subscription_payment):
 * se ainda há pedido de upgrade para plano igual ou menor que o atual, remove a
 * cobrança da diferença no Asaas e limpa a pendência. Best-effort: nunca lança.
 */
export async function closeStaleUpgrade(supabase: SupabaseClient, assinaturaId: string): Promise<void> {
  try {
    const { data, error } = await supabase.from("assinaturas")
      .select("id, plano, upgrade_pendente_plano, upgrade_pendente_payment_id")
      .eq("id", assinaturaId).maybeSingle();
    if (error) { console.error("ALERTA upgrade: leitura para fechar pendência falhou", assinaturaId, error.message); return; }
    const row = data as { id: string; plano: string | null; upgrade_pendente_plano: string | null; upgrade_pendente_payment_id: string | null } | null;
    const pid = row?.upgrade_pendente_payment_id;
    if (!row || !pid) return;
    const atual = PLAN_RANK[String(row.plano ?? "")] ?? 0;
    const pedido = PLAN_RANK[String(row.upgrade_pendente_plano ?? "")] ?? 0;
    if (!(atual > 0 && pedido > 0 && pedido <= atual)) return;
    const key = asaasApiKey();
    if (!key) { console.error("ALERTA upgrade: chave do Asaas ausente, cobrança de upgrade não removida", row.id, pid); return; }
    const res = await fetch(`${asaasBaseUrl()}/payments/${encodeURIComponent(pid)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", access_token: key },
    });
    await res.body?.cancel().catch(() => {});
    if (!res.ok && res.status !== 404) {
      console.error("ALERTA upgrade: DELETE da cobrança de upgrade falhou", row.id, pid, res.status);
      return;
    }
    const { error: clrErr } = await supabase.from("assinaturas").update({ ...CLEAR_PENDING, upgrade_ultimo_payment_id: pid })
      .eq("id", row.id).eq("upgrade_pendente_payment_id", pid);
    if (clrErr) { console.error("ALERTA upgrade: pendência não limpa", row.id, pid, clrErr.message); return; }
    console.log("[asaas-webhook] upgrade pendente encerrado pela mensalidade:", row.id, pid);
  } catch (err) {
    console.error("ALERTA upgrade: falha ao encerrar pendência", assinaturaId, err instanceof Error ? err.message : String(err));
  }
}
