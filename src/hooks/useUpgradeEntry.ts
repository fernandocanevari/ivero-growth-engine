import { useCallback } from "react";
import { useInRouterContext, useNavigate } from "react-router-dom";
import { useAccountType } from "@/hooks/useAccountType";

export const AGENCY_BILLING_PATH = "/dashboard/marcas/assinatura";

/** Navegação que funciona dentro e fora de um Router (alguns testes renderizam sem Router). */
export function useSafeNavigate() {
  const inRouter = useInRouterContext();
  // inRouter é estável durante a vida do componente.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const navigate = inRouter ? useNavigate() : null;
  return useCallback(
    (path: string) => {
      if (navigate) navigate(path);
      else window.location.href = path;
    },
    [navigate],
  );
}

/**
 * Ponto único de entrada de upgrade/contratação.
 * Agência → faturamento consolidado por marca (nunca abre o UpgradeModal).
 * Individual → chama openModal(), exatamente como antes.
 */
export function useUpgradeEntry(openModal: () => void) {
  const { isAgency, isLoading } = useAccountType();
  const go = useSafeNavigate();
  const openUpgrade = useCallback(() => {
    if (isAgency) go(AGENCY_BILLING_PATH);
    else openModal();
  }, [isAgency, go, openModal]);
  return { openUpgrade, isAgency, isLoading };
}
