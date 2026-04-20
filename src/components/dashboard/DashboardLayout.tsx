import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import OnboardingWizard from "./OnboardingWizard";
import { useOnboarding } from "@/hooks/useOnboarding";

const SNOOZE_KEY = "ivero_onboarding_snoozed_until";
const SNOOZE_MS = 24 * 60 * 60 * 1000; // 24h

export default function DashboardLayout() {
  const { needsOnboarding, isLoading } = useOnboarding();
  const [dismissed, setDismissed] = useState(false);
  const [snoozed, setSnoozed] = useState(true); // default true to avoid flash

  useEffect(() => {
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    setSnoozed(Date.now() < until);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    setDismissed(true);
  };

  const handleComplete = () => {
    localStorage.removeItem(SNOOZE_KEY);
    setDismissed(true);
  };

  const showOnboarding = needsOnboarding && !dismissed && !isLoading && !snoozed;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-4 border-b border-border px-4 bg-background sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Fev 2026</span>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
      {showOnboarding && <OnboardingWizard onComplete={handleComplete} onDismiss={handleDismiss} />}
    </SidebarProvider>
  );
}
