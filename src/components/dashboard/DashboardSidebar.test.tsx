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
          <Route path="/dashboard" element={<div data-testid="page-content">Conteúdo Dashboard</div>} />
          <Route path="/dashboard/diagnostico" element={<div data-testid="page-content">Conteúdo Diagnóstico</div>} />
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

  it("renderiza o item Painel com link para /dashboard", () => {
    render(<Harness />);
    const link = screen.getByRole("link", { name: /^Painel$/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("permanece renderizada após clicar em 'Painel' e carregar a página", () => {
    render(<Harness initialPath="/dashboard/diagnostico" />);

    expect(screen.getByText("Ivero")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo Diagnóstico")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /^Painel$/i }));

    // Sidebar continua montada E página de destino renderizou
    expect(screen.getByText("Ivero")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Painel$/i })).toBeInTheDocument();
    expect(screen.getByText("Conteúdo Dashboard")).toBeInTheDocument();
  });

  it("mantém a sidebar ao navegar entre sub-rotas e migra o aria-current", () => {
    render(<Harness initialPath="/dashboard" />);

    expect(screen.getByRole("link", { name: /^Painel$/i })).toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("link", { name: /Diagnóstico/i }));

    expect(screen.getByText("Ivero")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Painel$/i })).not.toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Diagnóstico/i })).toHaveAttribute("aria-current", "page");
  });

  it("após remount (simulando reload) a sidebar volta com Painel ativo", () => {
    const { unmount } = render(<Harness initialPath="/dashboard" />);
    expect(screen.getByText("Ivero")).toBeInTheDocument();
    unmount();

    render(<Harness initialPath="/dashboard" />);
    expect(screen.getByText("Ivero")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Painel$/i })).toHaveAttribute("aria-current", "page");
  });

  it("aplica as classes de contraste do estado ativo no item selecionado", () => {
    render(<Harness initialPath="/dashboard" />);
    const link = screen.getByRole("link", { name: /^Painel$/i });
    expect(link.className).toMatch(/bg-primary\/15/);
    expect(link.className).toMatch(/text-primary/);
    expect(link.className).toMatch(/ring-primary\/25/);
  });

  it("NÃO marca o item Painel como ativo quando em uma sub-rota (end: true)", () => {
    render(<Harness initialPath="/dashboard/diagnostico" />);
    const link = screen.getByRole("link", { name: /^Painel$/i });
    expect(link).not.toHaveAttribute("aria-current", "page");
  });
});
