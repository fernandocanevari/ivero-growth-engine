import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AGENCY_BILLING_ROUTE } from "@/lib/subscription-status";
import { invalidateAccessCache } from "@/lib/access-cache";

type Outcome = "success" | "upgrade" | "cancelado" | "expirado";

/**
 * RetornoAsaasPage — landing das URLs de callback da Checkout Session.
 *
 * O Asaas rejeita callbacks com query string, então o create-checkout aponta
 * para rotas limpas (/retorno-asaas, /retorno-asaas-upgrade,
 * /retorno-asaas-cancelado, /retorno-asaas-expirado) e aqui traduzimos para o
 * destino real do app.
 */
const RetornoAsaasPage = ({ outcome }: { outcome: Outcome }) => {
  const navigate = useNavigate();

  useEffect(() => {
    invalidateAccessCache();
    if (outcome === "success") {
      navigate("/bem-vindo?from=asaas", { replace: true });
    } else if (outcome === "upgrade") {
      navigate("/bem-vindo?from=asaas&tipo=upgrade", { replace: true });
    } else {
      // Agência volta ao faturamento consolidado, nunca aos planos individuais.
      (async () => {
        let isAgency = false;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase.from("profiles").select("account_type").eq("user_id", user.id).maybeSingle();
            isAgency = (data as { account_type?: string } | null)?.account_type === "agency";
          }
        } catch { /* segue como individual */ }
        navigate(isAgency ? AGENCY_BILLING_ROUTE : "/escolher-plano?motivo=checkout_cancelado", { replace: true });
      })();
    }
  }, [navigate, outcome]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Loader2 className="h-10 w-10 text-accent animate-spin" />
      <p className="text-muted-foreground">
        {outcome === "success" || outcome === "upgrade"
          ? "Voltando para o Ivero..."
          : "Checkout encerrado. Levando você de volta aos planos..."}
      </p>
    </div>
  );
};

export default RetornoAsaasPage;
