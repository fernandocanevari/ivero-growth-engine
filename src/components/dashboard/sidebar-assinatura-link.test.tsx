/**
 * Destino do item "Assinatura" no menu lateral por tipo de conta.
 * Agência → /dashboard/marcas/assinatura; individual → /dashboard/assinatura.
 * Rótulo e ícone permanecem os mesmos.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

let account = { accountType: "agency", agencyName: "Ag", isLoading: false, isAgency: true };
const AGENCY = { accountType: "agency", agencyName: "Ag", isLoading: false, isAgency: true };
const INDIVIDUAL = { accountType: "individual", agencyName: null, isLoading: false, isAgency: false };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));
vi.mock("@/hooks/useAccountType", () => ({ useAccountType: () => account }));
vi.mock("@/hooks/useBrandSettings", () => ({ useBrandSettings: () => ({ data: null }) }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isAdmin: false, isLoading: false }) }));
vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => ({ isPaid: false, isTrial: true, plano: "presenca", isLoading: false }),
}));
vi.mock("@/hooks/usePerceptionAlerts", () => ({ usePerceptionAlerts: () => ({ unreadCount: 0 }) }));
vi.mock("@/lib/analytics", () => ({ resetIdentity: () => {} }));

import { DashboardSidebar } from "./DashboardSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <SidebarProvider>
        <DashboardSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("Item 'Assinatura' da sidebar", () => {
  beforeEach(() => localStorage.clear());

  it("agência: aponta para o faturamento consolidado", () => {
    account = AGENCY;
    renderSidebar();
    const link = screen.getByRole("link", { name: /Assinatura/i });
    expect(link.getAttribute("href")).toBe("/dashboard/marcas/assinatura");
  });

  it("individual: aponta para a assinatura individual", () => {
    account = INDIVIDUAL;
    renderSidebar();
    const link = screen.getByRole("link", { name: /Assinatura/i });
    expect(link.getAttribute("href")).toBe("/dashboard/assinatura");
  });
});
