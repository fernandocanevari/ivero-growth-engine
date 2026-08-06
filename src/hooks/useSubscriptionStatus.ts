import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";
import { resolveEffectiveStatus } from "@/lib/subscription-status";

type Plano = "presenca" | "influencia" | "autoridade" | null;

interface AssinaturaRow {
  plano: string | null;
  status: string | null;
  carencia_ate: string | null;
  trial_ends_at: string | null;
}


export function useSubscriptionStatus() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [assinaturaLoading, setAssinaturaLoading] = useState(true);
  const [assinatura, setAssinatura] = useState<AssinaturaRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // Enquanto a sessão não resolve, userId === null não significa "sem usuário".
  const [authResolved, setAuthResolved] = useState(false);

  // Track auth user (server-validated) and react to login/logout
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) {
        setUserId(data.user?.id ?? null);
        setAuthResolved(true);
      }
    };
    sync();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignora eventos sem sessão (ex.: INITIAL_SESSION antes da recuperação):
      // marcariam authResolved cedo demais, com userId null → flash de bloqueio.
      if (!session && event !== "SIGNED_OUT") return;
      setAuthResolved(true);
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchAssinatura = async () => {
      setAssinaturaLoading(true);

      if (!authResolved) return; // mantém loading até a sessão resolver

      if (!userId) {
        if (!cancelled) {
          setAssinatura(null);
          setAssinaturaLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("assinaturas")
        .select("plano, status, carencia_ate")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setAssinatura(error ? null : (data as AssinaturaRow | null));
        setAssinaturaLoading(false);
      }
    };

    fetchAssinatura();

    return () => {
      cancelled = true;
    };
  }, [userId, authResolved]);

  const isLoading = roleLoading || !authResolved || assinaturaLoading;

  let isTrial = false;
  let isPaid = false;
  let plano: Plano = null;
  let status: string = "trial";
  const carenciaAte: string | null = assinatura?.carencia_ate ?? null;

  if (!assinatura) {
    isTrial = true;
    isPaid = false;
    plano = null;
    status = "trial";
  } else {
    status = assinatura.status ?? "trial";
    plano = (assinatura.plano as Plano) ?? null;

    if (status === "ativo") {
      isPaid = true;
      isTrial = false;
    } else if (status === "inadimplente") {
      const withinGrace =
        carenciaAte !== null && new Date(carenciaAte).getTime() > Date.now();
      isPaid = withinGrace;
      isTrial = false;
    } else if (status === "cancelado") {
      isPaid = false;
      isTrial = false;
    } else if (status === "trial") {
      isTrial = true;
      isPaid = false;
    } else {
      isTrial = true;
      isPaid = false;
    }
  }

  // Admin override
  if (isAdmin) {
    isPaid = true;
  }

  return {
    isTrial,
    isPaid,
    isAdmin,
    isLoading,
    plano,
    status,
    carenciaAte,
  };
}
