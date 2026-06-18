import { useLocation } from "react-router-dom";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import {
  isFeatureAvailable,
  getRequiredTier,
  getLockedRouteInfo,
} from "@/lib/access-control";
import { TrialLockedPage } from "./TrialLockedPage";

interface FeatureGateProps {
  children: React.ReactNode;
}

/**
 * FeatureGate — envolve uma rota do dashboard e bloqueia o acesso
 * quando o plano atual do usuário não atende ao tier mínimo da rota.
 * Reusa TrialLockedPage para a UI de "feature bloqueada".
 */
export function FeatureGate({ children }: FeatureGateProps) {
  const location = useLocation();
  const { isPaid, isAdmin, isTrial, isLoading, plano } = useSubscriptionStatus();

  if (isLoading) return null;

  const allowed = isFeatureAvailable(
    location.pathname,
    plano,
    isPaid,
    isAdmin,
    isTrial,
  );

  if (allowed) return <>{children}</>;

  const info = getLockedRouteInfo(location.pathname);
  const requiredTier = getRequiredTier(location.pathname) ?? undefined;

  return (
    <TrialLockedPage
      title={info.title}
      description={info.description}
      requiredTier={requiredTier}
    />
  );
}

export default FeatureGate;
