import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import OnboardingWizard from "./OnboardingWizard";
import SupportWidget from "./SupportWidget";
import { TrialBanner } from "./TrialBanner";
import ModelsStatusBanner from "./ModelsStatusBanner";
import { TrialLockedPage } from "./TrialLockedPage";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { isRouteAllowedInTrial, getLockedRouteInfo } from "@/lib/access-control";
import { supabase } from "@/integrations/supabase/client";
import { useAdoptPendingAudit } from "@/hooks/useAdoptPendingAudit";

const SNOOZE_PREFIX = "ivero_onboarding_snoozed_until:";
const LEGACY_KEY = "ivero_onboarding_snoozed_until";
const SNOOZE_MS = 24 * 60 * 60 * 1000; // 24h

export default function DashboardLayout() {
  const { needsOnboarding, isLoading } = useOnboarding();
  const { isPaid, isAdmin } = useSubscriptionStatus();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [snoozed, setSnoozed] = useState(true); // default true to avoid flash
  const [userId, setUserId] = useState<string | null>(null);

  // Adopta snapshot anônimo do sessionStorage (caso o usuário tenha vindo do /preview).
  useAdoptPendingAudit();

  // Resolve current user, then check per-user snooze (and clear legacy global key)
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      // Clear legacy global snooze key from previous version (was shared across users)
      localStorage.removeItem(LEGACY_KEY);
      if (!user) {
        setSnoozed(false);
        return;
      }
      setUserId(user.id);
      const until = Number(localStorage.getItem(SNOOZE_PREFIX + user.id) || 0);
      setSnoozed(Date.now() < until);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleDismiss = () => {
    if (userId) {
      localStorage.setItem(SNOOZE_PREFIX + userId, String(Date.now() + SNOOZE_MS));
    }
    setDismissed(true);
  };

  const handleComplete = () => {
    if (userId) {
      localStorage.removeItem(SNOOZE_PREFIX + userId);
    }
    setDismissed(true);
  };

  const showOnboarding = needsOnboarding && !dismissed && !isLoading && !snoozed;

  // Trial gating: admins e usuários pagos passam direto.
  // Trial users só veem rotas listadas em TRIAL_ALLOWED_ROUTES.
  const allowAccess =
    isPaid || isAdmin || isRouteAllowedInTrial(location.pathname);
  const lockedInfo = allowAccess ? null : getLockedRouteInfo(location.pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="sticky top-0 z-10 bg-background">
            <TrialBanner userId={userId} />
            <header className="h-14 flex items-center gap-4 border-b border-border px-4">
              <SidebarTrigger />
              <div className="flex-1" />
              <div className="flex items-center gap-2">
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
              <Outlet />
            )}
          </main>
        </div>
      </div>
      {showOnboarding && <OnboardingWizard onComplete={handleComplete} onDismiss={handleDismiss} />}
      <SupportWidget />
    </SidebarProvider>
  );
}
