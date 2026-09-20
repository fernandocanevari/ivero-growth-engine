import { Loader2 } from "lucide-react";

/**
 * Aviso discreto para quem acabou de contratar e o pagamento ainda não foi
 * confirmado pelo provedor. O acesso segue liberado durante a janela de
 * tolerância — o objetivo aqui é só explicar o estado, não bloquear.
 */
export function PendingPaymentBanner() {
  return (
    <div className="w-full border-b border-border bg-muted/50 px-4 py-2">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        Contratação identificada. Seu acesso já está liberado enquanto confirmamos
        o pagamento com o banco.
      </p>
    </div>
  );
}

export default PendingPaymentBanner;
