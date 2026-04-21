import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import OnboardingWizard from "./OnboardingWizard";
import { TrialBanner } from "./TrialBanner";
import { TrialLockedPage } from "./TrialLockedPage";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { isRouteAllowedInTrial, getLockedRouteInfo } from "@/lib/access-control";
import { supabase } from "@/integrations/supabase/client";

const SNOOZE_PREFIX = "ivero_onboarding_snoozed_until:";
const LEGACY_KEY = "ivero_onboarding_snoozed_until";
const SNOOZE_MS = 24 * 60 * 60 * 1000; // 24h

export default function DashboardLayout() {
  const { needsOnboarding, isLoading } = useOnboarding();
  const [dismissed, setDismissed] = useState(false);
  const [snoozed, setSnoozed] = useState(true); // default true to avoid flash
  const [userId, setUserId] = useState<string | null>(null);

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
            <Outlet />
          </main>
        </div>
      </div>
      {showOnboarding && <OnboardingWizard onComplete={handleComplete} onDismiss={handleDismiss} />}
    </SidebarProvider>
  );
}
