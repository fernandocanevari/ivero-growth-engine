import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type SubscriptionGateContextValue = {
  isInGracePeriod: boolean;
  status: string | null;
  carenciaAte: string | null;
};

const SubscriptionGateContext = createContext<SubscriptionGateContextValue>({
  isInGracePeriod: false,
  status: null,
  carenciaAte: null,
});

export function useSubscriptionGate() {
  return useContext(SubscriptionGateContext);
}

type ProtectedRouteProps = {
  children: React.ReactNode;
  /** When false, only the auth check runs (used by /escolher-plano, /bem-vindo, /welcome). */
  requireSubscription?: boolean;
};

export function ProtectedRoute({ children, requireSubscription = true }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [gate, setGate] = useState<SubscriptionGateContextValue>({
    isInGracePeriod: false,
    status: null,
    carenciaAte: null,
  });
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const evaluate = async (session: { user: { id: string } } | null) => {
      if (!session) {
        if (!cancelled) {
          setAuthorized(false);
          setLoading(false);
          navigate("/auth", { replace: true });
        }
        return;
      }

      if (!requireSubscription) {
        if (!cancelled) {
          setAuthorized(true);
          setLoading(false);
        }
        return;
      }

      // Admin bypass — always allow
      try {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        const isAdmin = (roles ?? []).some((r) => r.role === "admin");
        if (isAdmin) {
          if (!cancelled) {
            setGate({ isInGracePeriod: false, status: "admin", carenciaAte: null });
            setAuthorized(true);
            setLoading(false);
          }
          return;
        }
      } catch {
        // ignore — fall through to subscription check
      }

      // Subscription check
      const { data: subs } = await supabase
        .from("assinaturas")
        .select("status, carencia_ate, updated_at")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      const sub = subs?.[0];
      const status = sub?.status ?? null;
      const carenciaAte = sub?.carencia_ate ?? null;

      if (cancelled) return;

      if (!sub || status === "pendente") {
        setAuthorized(false);
        setLoading(false);
        navigate("/escolher-plano", { replace: true });
        return;
      }

      if (status === "ativo" || status === "trial") {
        setGate({ isInGracePeriod: false, status, carenciaAte });
        setAuthorized(true);
        setLoading(false);
        return;
      }

      if (status === "inadimplente") {
        const inGrace = carenciaAte ? new Date(carenciaAte).getTime() > Date.now() : false;
        if (inGrace) {
          setGate({ isInGracePeriod: true, status, carenciaAte });
          setAuthorized(true);
          setLoading(false);
        } else {
          setAuthorized(false);
          setLoading(false);
          navigate("/escolher-plano?motivo=inadimplente", { replace: true });
        }
        return;
      }

      if (status === "cancelado") {
        setAuthorized(false);
        setLoading(false);
        navigate("/escolher-plano?motivo=cancelado", { replace: true });
        return;
      }

      // Unknown status — treat as needing to choose a plan
      setAuthorized(false);
      setLoading(false);
      navigate("/escolher-plano", { replace: true });
    };

    supabase.auth.getSession().then(({ data: { session } }) => evaluate(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate, requireSubscription]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <SubscriptionGateContext.Provider value={gate}>
      {children}
    </SubscriptionGateContext.Provider>
  );
}
