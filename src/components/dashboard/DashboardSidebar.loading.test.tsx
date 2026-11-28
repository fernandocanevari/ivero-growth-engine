/** P66 — rodapé da sidebar não pisca "Sua Marca / Trial" no primeiro carregamento. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";

let BRAND: Record<string, unknown> = {};
let SUB: Record<string, unknown> = {};
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isAdmin: false, isLoading: false }) }));
vi.mock("@/hooks/useAccountType", () => ({ useAccountType: () => ({ isAgency: false, isLoading: false }) }));
vi.mock("@/hooks/useBrandSettings", () => ({ useBrandSettings: () => BRAND }));
vi.mock("@/hooks/useSubscriptionStatus", () => ({ useSubscriptionStatus: () => SUB }));
vi.mock("@/hooks/usePerceptionAlerts", () => ({ usePerceptionAlerts: () => ({ unreadCount: 0 }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signOut: vi.fn().mockResolvedValue({}) } } }));
vi.mock("@/lib/analytics", () => ({ resetIdentity: vi.fn() }));

import { DashboardSidebar } from "./DashboardSidebar";

const LOADING_SUB = { isPaid: false, isTrial: true, plano: null, isLoading: true };
const renderIt = (open = true) =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <SidebarProvider defaultOpen={open}>
        <DashboardSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );

describe("P66 sidebar footer loading", () => {
  beforeEach(() => { document.cookie = ""; });

  it("enquanto carrega: placeholders, sem 'Trial' nem 'Sua Marca'", () => {
    BRAND = { data: undefined, isLoading: true };
    SUB = LOADING_SUB;
    renderIt();
    expect(screen.getByTestId("sidebar-name-loading")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-plan-loading")).toBeInTheDocument();
    expect(screen.queryByText("Trial")).toBeNull();
    expect(screen.queryByText("Sua Marca")).toBeNull();
  });

  it("trial carregado sem nome de marca: 'Sua Marca' e 'Trial'", () => {
    BRAND = { data: null, isLoading: false };
    SUB = { isPaid: false, isTrial: true, plano: "presenca", isLoading: false };
    renderIt();
    expect(screen.getByText("Sua Marca")).toBeInTheDocument();
    expect(screen.getByText("Trial")).toBeInTheDocument();
  });

  it("pago carregado (mock sem isLoading): 'Plano Pago', sem placeholders", () => {
    BRAND = { data: { brand_name: "Minha Marca" } };
    SUB = { isPaid: true, isTrial: false, plano: "influencia", isLoading: false };
    renderIt();
    expect(screen.getByText("Plano Pago")).toBeInTheDocument();
    expect(screen.getByText("Minha Marca")).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-name-loading")).toBeNull();
    expect(screen.queryByTestId("sidebar-plan-loading")).toBeNull();
  });

  it("recolhida enquanto carrega: nenhum tooltip com 'Trial'", () => {
    BRAND = { data: undefined, isLoading: true };
    SUB = LOADING_SUB;
    renderIt(false);
    const footer = document.querySelector('[data-sidebar="footer"]') as HTMLElement;
    const avatar = footer.querySelector(".rounded-full") as HTMLElement;
    fireEvent.pointerMove(avatar);
    fireEvent.focus(avatar);
    expect(document.body.textContent).not.toMatch(/Trial/);
    expect(document.body.textContent).not.toMatch(/Sua Marca/);
  });
});
