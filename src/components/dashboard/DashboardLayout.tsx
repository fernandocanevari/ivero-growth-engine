import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardBreadcrumb } from "./DashboardBreadcrumb";
import SupportWidget from "./SupportWidget";
import { TrialBanner } from "./TrialBanner";

import { TrialLockedPage } from "./TrialLockedPage";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { isRouteAllowedInTrial, getLockedRouteInfo } from "@/lib/access-control";
import { supabase } from "@/integrations/supabase/client";
import { useAdoptPendingAudit } from "@/hooks/useAdoptPendingAudit";
import { useTrackOnboardingVisit } from "@/hooks/useDashboardOnboarding";
import { LibrarySheet } from "./LibrarySheet";
import BrandProfileModal from "./BrandProfileModal";
import BrandProfileReminderBanner from "./BrandProfileReminderBanner";
import { useBrandProfile } from "@/hooks/useBrandProfile";
import { useHasDiagnostic } from "@/hooks/useHasDiagnostic";
import { useSubscriptionGate } from "@/components/ProtectedRoute";




export default function DashboardLayout() {
  
  const { isPaid, isAdmin } = useSubscriptionStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const { isInGracePeriod, carenciaAte } = useSubscriptionGate();
  const [userId, setUserId] = useState<string | null>(null);
  const [brandModalDismissed, setBrandModalDismissed] = useState(false);
  const [brandModalForceOpen, setBrandModalForceOpen] = useState(false);
  const { hasDiagnostic } = useHasDiagnostic();
  const { hasCompletedBrandProfile, skippedRecently, shouldRemind, isLoading: brandLoading } =
    useBrandProfile();


  // Adopta snapshot anônimo do sessionStorage (caso o usuário tenha vindo do /preview).
  useAdoptPendingAudit();
  // Marca etapas do onboarding automaticamente conforme o usuário visita rotas.
  useTrackOnboardingVisit();

  // Resolve current user (used pelo TrialBanner).
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      // Clear legacy snooze keys do onboarding pop-up antigo
      localStorage.removeItem("ivero_onboarding_snoozed_until");
      if (user) {
        setUserId(user.id);
        localStorage.removeItem("ivero_onboarding_snoozed_until:" + user.id);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Trial gating: admins e usuários pagos passam direto.
  // Trial users só veem rotas listadas em TRIAL_ALLOWED_ROUTES.
  const allowAccess =
    isPaid || isAdmin || isRouteAllowedInTrial(location.pathname);
  const lockedInfo = allowAccess ? null : getLockedRouteInfo(location.pathname);

  // Perfil da Marca: abre automaticamente após o 1º diagnóstico, se ainda não preenchido
  // e o usuário não pediu para adiar (skippedRecently = últimos 3 dias).
  const showBrandModal =
    brandModalForceOpen ||
    (!brandLoading &&
      hasDiagnostic === true &&
      !hasCompletedBrandProfile &&
      !skippedRecently &&
      !brandModalDismissed);

  const gracePeriodDate = carenciaAte
    ? new Date(carenciaAte).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <SidebarProvider>
      {isInGracePeriod && (
        <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="flex items-center justify-between gap-4 max-w-full">
            <div className="flex items-center gap-3 min-w-0">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                Seu pagamento está pendente. Você tem acesso até{" "}
                <strong>{gracePeriodDate}</strong>. Regularize agora para não
                perder o acesso.
              </p>
            </div>
            <button
              onClick={() => navigate("/escolher-plano")}
              className="text-sm font-medium text-amber-900 hover:text-amber-950 underline underline-offset-2 shrink-0 whitespace-nowrap"
            >
              Regularizar agora →
            </button>
          </div>
        </div>
      )}
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="sticky top-0 z-10 bg-background">
            <TrialBanner userId={userId} />
            {/* Banner inline removido — substituído pelo BrandProfileReminderBanner acima do conteúdo. */}
            <header className="h-14 flex items-center gap-4 border-b border-border px-4">
              <SidebarTrigger />
              <DashboardBreadcrumb className="flex-1" />
              <div className="flex items-center gap-2">
                <LibrarySheet />
                <span className="text-sm text-muted-foreground">Fev 2026</span>
              </div>
            </header>
          </div>
          <main className="flex-1 p-6 overflow-auto">
            {lockedInfo ? (
              <TrialLockedPage
                title={lockedInfo.title}
                description={lockedInfo.description}
              />
            ) : (
              <>
                {shouldRemind && !showBrandModal && (
                  <BrandProfileReminderBanner
                    onOpenModal={() => setBrandModalDismissed(false)}
                  />
                )}
                <Outlet />
              </>
            )}
          </main>
        </div>
      </div>
      {showBrandModal && (
        <BrandProfileModal onClose={() => setBrandModalDismissed(true)} />
      )}
      <SupportWidget />
    </SidebarProvider>
  );
}
