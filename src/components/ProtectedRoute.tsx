import { createContext, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const evaluate = async (session: { user: { id: string } } | null) => {
      if (!session) {
        if (!cancelled) {
          setAuthorized(false);
          setLoading(false);
          const redirectTo = `${location.pathname}${location.search}`;
          navigate(`/auth?redirect=${encodeURIComponent(redirectTo)}`, { replace: true });
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

      // Subscription check with retry to tolerate read-after-write race
      // (newly-created trial row may not be visible on the very first query).
      const RETRY_DELAYS_MS = [400, 800, 1200];
      let sub: { status: string | null; carencia_ate: string | null; updated_at: string | null } | undefined;
      let status: string | null = null;
      let carenciaAte: string | null = null;
      let attempt = 0;

      while (true) {
        const { data: subs } = await supabase
          .from("assinaturas")
          .select("status, carencia_ate, updated_at")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (cancelled) return;

        sub = subs?.[0];
        status = sub?.status ?? null;
        carenciaAte = sub?.carencia_ate ?? null;

        const isValidNow =
          sub &&
          (status === "ativo" ||
            status === "trial" ||
            (status === "inadimplente" &&
              carenciaAte &&
              new Date(carenciaAte).getTime() > Date.now()));

        if (isValidNow) {
          if (attempt > 0) {
            console.log(`[ProtectedRoute] Subscription found after ${attempt} retry attempt(s).`);
          }
          break;
        }

        if (attempt >= RETRY_DELAYS_MS.length) {
          if (attempt > 0) {
            console.log(
              `[ProtectedRoute] No valid subscription after ${attempt} retries (status=${status ?? "null"}). Proceeding to redirect logic.`,
            );
          }
          break;
        }

        console.log(
          `[ProtectedRoute] Subscription not yet valid (status=${status ?? "null"}). Retrying in ${RETRY_DELAYS_MS[attempt]}ms (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        attempt++;
        if (cancelled) return;
      }

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
  }, [location.pathname, location.search, navigate, requireSubscription]);

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
