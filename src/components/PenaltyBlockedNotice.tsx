import { useState } from "react";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { penaltyBlockedMessage } from "@/lib/penalty";
import { payPenaltyAndOpen } from "@/lib/penalty-flow";

/**
 * P26-fix2 — aviso fixo de multa pendente (substitui o toast). Mesmo fluxo de
 * "Pagar multa" de antes: manage-subscription/pay_penalty abre a fatura.
 */
export function PenaltyBlockedNotice({ valor, className = "" }: { valor: number; className?: string }) {
  const [paying, setPaying] = useState(false);
  const pay = async () => {
    setPaying(true);
    try { await payPenaltyAndOpen(); } finally { setPaying(false); }
  };
  return (
    <div
      role="alert"
      data-testid="penalty-blocked-notice"
      className={`rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-foreground ${className}`}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        <p className="leading-relaxed">{penaltyBlockedMessage(valor)}</p>
      </div>
      <Button size="sm" className="mt-3" onClick={() => void pay()} disabled={paying}>
        {paying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="mr-1.5 h-3.5 w-3.5" />}
        Pagar multa
      </Button>
    </div>
  );
}
