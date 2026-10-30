import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invalidateAccessCache } from "@/lib/access-cache";
import { PENALTY_UNAVAILABLE_MESSAGE, penaltyBlockedMessage } from "@/lib/penalty";

export type PayPenaltyOutcome = "opened" | "cleared" | "failed";

/**
 * Pede a cobrança da multa (manage-subscription/pay_penalty) e abre a fatura
 * em nova aba. Quitada/perdoada → avisa que já dá para voltar.
 */
export async function payPenaltyAndOpen(): Promise<PayPenaltyOutcome> {
  const { data, error } = await supabase.functions.invoke("manage-subscription", {
    body: { action: "pay_penalty" },
  });
  if (error || !data) {
    toast.error(PENALTY_UNAVAILABLE_MESSAGE);
    return "failed";
  }
  if (data.ok && data.invoiceUrl) {
    window.open(data.invoiceUrl as string, "_blank", "noopener");
    return "opened";
  }
  if (data.ok && (data.paid || data.forgiven || data.nothing_pending)) {
    invalidateAccessCache();
    toast.success(
      data.paid
        ? "Pagamento da multa confirmado. Você já pode assinar de novo."
        : "Não há multa pendente. Você já pode assinar de novo.",
    );
    return "cleared";
  }
  toast((data.message as string | undefined) ?? PENALTY_UNAVAILABLE_MESSAGE);
  return "failed";
}

/** Resposta "multa_pendente" do create-checkout: mensagem clara + botão "Pagar multa". */
export function showPenaltyBlocked(data: { valor?: unknown }) {
  toast(penaltyBlockedMessage(Number(data.valor ?? 0)), {
    duration: 15_000,
    action: { label: "Pagar multa", onClick: () => void payPenaltyAndOpen() },
  });
}
