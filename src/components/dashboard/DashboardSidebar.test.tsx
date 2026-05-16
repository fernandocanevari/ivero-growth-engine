import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";

// --- Mocks dos hooks consumidos pela sidebar ---
vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ isAdmin: false, isLoading: false }),
}));
vi.mock("@/hooks/useBrandSettings", () => ({
  useBrandSettings: () => ({ data: { brand_name: "Minha Marca" } }),
}));
vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => ({ isPaid: true, isTrial: false, isAdmin: false, isLoading: false }),
}));
vi.mock("@/hooks/usePerceptionAlerts", () => ({
  usePerceptionAlerts: () => ({ unreadCount: 0 }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut: vi.fn().mockResolvedValue({}) } },
}));
vi.mock("@/lib/analytics", () => ({ resetIdentity: vi.fn() }));

import { DashboardSidebar } from "./DashboardSidebar";

function Harness({ initialPath = "/dashboard/diagnostico" }: { initialPath?: string }) {
  function CurrentPath() {
    const loc = useLocation();
    return <span data-testid="current-path">{loc.pathname}</span>;
  }
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <SidebarProvider>
        <DashboardSidebar />
        <Routes>
          <Route path="*" element={<CurrentPath />} />
        </Routes>
      </SidebarProvider>
    </MemoryRouter>
  );
}

describe("DashboardSidebar — persistência após navegação", () => {
  beforeEach(() => {
    document.cookie = "";
  });

  it("renderiza o item Dashboard com link para /dashboard", () => {
    render(<Harness />);
    const link = screen.getByRole("link", { name: /^Dashboard$/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("permanece renderizada após clicar em 'Dashboard' e navegar", () => {
    render(<Harness initialPath="/dashboard/diagnostico" />);

    // Antes do clique: sidebar visível, rota = /dashboard/diagnostico
    expect(screen.getByText("Ivero")).toBeInTheDocument();
    expect(screen.getByTestId("current-path").textContent).toBe("/dashboard/diagnostico");

    // Clica em Dashboard
    fireEvent.click(screen.getByRole("link", { name: /^Dashboard$/i }));

    // Depois do clique: sidebar continua montada e rota mudou para /dashboard
    expect(screen.getByText("Ivero")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Dashboard$/i })).toBeInTheDocument();
    expect(screen.getByTestId("current-path").textContent).toBe("/dashboard");
  });

  it("marca o item Dashboard como ativo (aria-current=page) na rota /dashboard", () => {
    render(<Harness initialPath="/dashboard" />);
    const link = screen.getByRole("link", { name: /^Dashboard$/i });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("NÃO marca o item Dashboard como ativo quando em uma sub-rota (end: true)", () => {
    render(<Harness initialPath="/dashboard/diagnostico" />);
    const link = screen.getByRole("link", { name: /^Dashboard$/i });
    expect(link).not.toHaveAttribute("aria-current", "page");
  });
});
