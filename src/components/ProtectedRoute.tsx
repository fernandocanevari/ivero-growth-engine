import { createContext, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { reconcilePendingPayment } from "@/lib/reconcile-pending";
import { fetchAccess, getCachedAccess, resetAccessForUser } from "@/lib/access-cache";
import { decideAccess, type AccessDecision } from "@/lib/access-decision";

type SubscriptionGateContextValue = {
  isInGracePeriod: boolean;
  status: string | null;
  carenciaAte: string | null;
  /** Pagamento recém-contratado, ainda sem confirmação do provedor. */
  isPendingCheckout?: boolean;
};

const SubscriptionGateContext = createContext<SubscriptionGateContextValue>({
  isInGracePeriod: false,
  status: null,
  carenciaAte: null,
  isPendingCheckout: false,
});

export function useSubscriptionGate() {
  return useContext(SubscriptionGateContext);
}

type ProtectedRouteProps = {
  children: React.ReactNode;
  /** When false, only the auth check runs (used by /escolher-plano, /bem-vindo, /welcome). */
  requireSubscription?: boolean;
};

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>
);

/**
 * Guarda de acesso. A página protegida só é renderizada quando existe uma
 * decisão "liberar" para a rota ATUAL — tomada agora com dados frescos, ou
 * derivada do cache (linha de assinatura + data atual). Bloqueio nunca vem do
 * cache: sem decisão fresca, mostra-se um carregando neutro.
 */
export function ProtectedRoute({ children, requireSubscription = true }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;
  const [resolved, setResolved] = useState<{ key: string; decision: AccessDecision } | null>(null);
  const [authOk, setAuthOk] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async (session: { user: { id: string } } | null) => {
      if (!session) {
        resetAccessForUser(null);
        if (!cancelled) {
          setAuthOk(false);
          navigate(`/auth?redirect=${encodeURIComponent(routeKey)}`, { replace: true });
        }
        return;
      }
      resetAccessForUser(session.user.id);
      if (!requireSubscription) {
        if (!cancelled) setAuthOk(true);
        return;
      }
      // Revalidação (em segundo plano quando o cache já liberou a rota).
      const fresh = await fetchAccess(session.user.id, { isCancelled: () => cancelled });
      if (cancelled || !fresh) return;
      const decision = decideAccess(fresh, location.pathname);
      setResolved({ key: routeKey, decision });
      if (decision.kind === "allow" && decision.reconcile) void reconcilePendingPayment();
      if (decision.kind === "block") navigate(decision.to, { replace: true });
    };

    supabase.auth.getSession().then(({ data: { session } }) => evaluate(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(session);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, navigate, requireSubscription]);

  if (!requireSubscription) {
    return authOk ? <>{children}</> : <Loading />;
  }

  // 1) Decisão fresca para esta rota.
  let decision: AccessDecision | null = resolved?.key === routeKey ? resolved.decision : null;
  // 2) Sem decisão fresca: o cache só serve para LIBERAR (status derivado agora).
  if (!decision) {
    const cached = getCachedAccess();
    if (cached && cached.sub !== undefined) {
      const d = decideAccess(cached, location.pathname);
      if (d.kind === "allow") decision = d;
    }
  }
  if (!decision) return <Loading />;
  if (decision.kind === "block") return null;

  return (
    <SubscriptionGateContext.Provider value={decision.gate}>{children}</SubscriptionGateContext.Provider>
  );
}
