import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";
import { cancelAccessUntil, resolveEffectiveStatus } from "@/lib/subscription-status";

type Plano = "presenca" | "influencia" | "autoridade" | null;

interface AssinaturaRow {
  plano: string | null;
  status: string | null;
  carencia_ate: string | null;
  trial_ends_at: string | null;
  data_vencimento: string | null;
  asaas_subscription_id: string | null;
  ciclo_contratado: string | null;
  ciclos_pagos: number | null;
  compromisso_inicio: string | null;
  compromisso_meses: number | null;
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

  // Extraído do effect para permitir recarga sob demanda (ex.: após troca de
  // plano ou retorno do checkout) sem forçar F5.
  const fetchAssinatura = useCallback(async () => {
    setAssinaturaLoading(true);

    if (!authResolved) return; // mantém loading até a sessão resolver

    if (!userId) {
      setAssinatura(null);
      setAssinaturaLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("assinaturas")
      .select(
        "plano, status, carencia_ate, trial_ends_at, data_vencimento, asaas_subscription_id, " +
          "ciclo_contratado, ciclos_pagos, compromisso_inicio, compromisso_meses",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setAssinatura(null);
    } else {
      setAssinatura((data as unknown as AssinaturaRow | null) ?? null);
    }
    setAssinaturaLoading(false);
  }, [userId, authResolved]);

  useEffect(() => {
    void fetchAssinatura();
  }, [fetchAssinatura]);


  const isLoading = roleLoading || !authResolved || assinaturaLoading;

  let isTrial = false;
  let isPaid = false;
  let plano: Plano = null;
  let status: string = "trial";
  const carenciaAte: string | null = assinatura?.carencia_ate ?? null;
  const dataVencimento: string | null = assinatura?.data_vencimento ?? null;
  const trialEndsAt: string | null = assinatura?.trial_ends_at ?? null;

  // Status efetivo derivado (trial vencido nunca conta como trial válido).
  const effectiveStatus = resolveEffectiveStatus(assinatura);
  const isTrialExpired = effectiveStatus === "trial_expirado";

  // Elegibilidade ao trial de 7 dias — usada SÓ para copy (a decisão real é
  // feita no create-checkout, com o histórico completo do usuário).
  const isTrialElegivel =
    !assinatura ||
    (effectiveStatus === "trial" && !isTrialExpired && trialEndsAt !== null) ||
    (assinatura.status === null && trialEndsAt === null);

  if (!assinatura) {
    isTrial = true;
    isPaid = false;
    plano = null;
    status = "trial";
  } else {
    plano = (assinatura.plano as Plano) ?? null;

    if (effectiveStatus === "ativo") {
      status = "ativo";
      isPaid = true;
      isTrial = false;
    } else if (effectiveStatus === "inadimplente") {
      status = "inadimplente";
      const withinGrace =
        carenciaAte !== null && new Date(carenciaAte).getTime() > Date.now();
      isPaid = withinGrace;
      isTrial = false;
    } else if (effectiveStatus === "cancelado") {
      status = "cancelado";
      // Mantém acesso até o fim do período já pago.
      isPaid = cancelAccessUntil(assinatura) !== null;
      isTrial = false;
    } else if (effectiveStatus === "trial_expirado") {
      status = "trial_expirado";
      isPaid = false;
      isTrial = false;
    } else if (effectiveStatus === "trial") {
      status = "trial";
      isTrial = true;
      isPaid = false;
    } else if (effectiveStatus === "pendente") {
      status = "pendente";
      isTrial = true;
      isPaid = false;
    } else {
      status = assinatura.status ?? "trial";
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
    dataVencimento,
    canceladoAcessoAte: cancelAccessUntil(assinatura),
    trialEndsAt,
    effectiveStatus,
    isTrialElegivel,
    isTrialExpired: isTrialExpired && !isAdmin,
    /** Existe vínculo vivo no provedor de pagamentos (assinatura recorrente). */
    hasAsaasSubscription: !!assinatura?.asaas_subscription_id,
    /** "mensal" (valor cheio, sem compromisso) ou "anual" (promocional, 12 meses). */
    cicloContratado: (assinatura?.ciclo_contratado === "mensal" ? "mensal" : "anual") as
      | "mensal"
      | "anual",
    /** Mensalidades já confirmadas — base da multa de fidelidade. */
    ciclosPagos: assinatura?.ciclos_pagos ?? 0,
    compromissoMeses: assinatura?.compromisso_meses ?? 12,
    compromissoInicio: assinatura?.compromisso_inicio ?? null,
    /** Recarrega a assinatura do banco (usado após upgrade/retorno de checkout). */
    refresh: fetchAssinatura,
  };


}
