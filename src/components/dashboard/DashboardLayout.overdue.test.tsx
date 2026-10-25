/**
 * Mensalidade vencida: o OverdueNotice é o ÚNICO aviso de atraso, dentro da
 * área de conteúdo. A faixa amarela antiga ("Regularize agora…") não existe mais.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const CARENCIA = "2026-10-14T02:59:59.999Z";
const overdue = { id: "pay_1", value: 497, dueDate: "2026-10-10", invoiceUrl: "https://invoice.invalid/pay_1" };

// isPaid = true durante a tolerância; false com a carência vencida (pausado).
let inGrace = true;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { id: "u1" } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "order", "limit"]) q[m] = () => q;
      q.maybeSingle = async () => ({ data: null });
      return q;
    },
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
    rpc: vi.fn(),
  },
}));
vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => ({
    plano: "presenca", status: "inadimplente", effectiveStatus: "inadimplente",
    isLoading: false, isPaid: inGrace, isTrial: false, isAdmin: false,
    isTrialExpired: false, trialEndsAt: null, carenciaAte: CARENCIA,
    refresh: vi.fn(), canceladoAcessoAte: null, dataVencimento: "2026-10-10",
    cicloContratado: "mensal", ciclosPagos: 1, compromissoMeses: 0, compromissoInicio: null,
  }),
}));
vi.mock("@/hooks/useBillingInvoices", () => ({
  useBillingInvoices: () => ({ invoices: [], next: null, overdue, isLoading: false, reload: vi.fn() }),
  INVOICE_STATUS_LABEL: {},
}));
// O guarda marca isInGracePeriod=true para inadimplente tanto na tolerância
// quanto na tela de cobrança com a carência vencida — era o que acendia a faixa antiga.
vi.mock("@/components/ProtectedRoute", () => ({
  useSubscriptionGate: () => ({ isInGracePeriod: true, status: "inadimplente", carenciaAte: CARENCIA, isPendingCheckout: false }),
}));
vi.mock("@/hooks/useAccountType", () => ({
  useAccountType: () => ({ accountType: "individual", agencyName: null, isLoading: false, isAgency: false }),
}));
vi.mock("@/hooks/useAdoptPendingAudit", () => ({ useAdoptPendingAudit: () => {} }));
vi.mock("@/hooks/useDashboardOnboarding", () => ({ useTrackOnboardingVisit: () => {} }));
vi.mock("@/hooks/useHasDiagnostic", () => ({ useHasDiagnostic: () => ({ hasDiagnostic: true }) }));
vi.mock("@/hooks/useBrandProfile", () => ({
  useBrandProfile: () => ({
    hasCompletedBrandProfile: true, skippedRecently: false, shouldRemind: false,
    agencyWithoutBrand: false, isLoading: false,
  }),
}));
vi.mock("@/lib/reconcile-pending", () => ({ reconcilePendingPayment: async () => null }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("./DashboardSidebar", () => ({ DashboardSidebar: () => <nav data-testid="sidebar" /> }));
vi.mock("./DashboardBreadcrumb", () => ({ DashboardBreadcrumb: () => null }));
vi.mock("./LibrarySheet", () => ({ LibrarySheet: () => null }));
vi.mock("./SupportWidget", () => ({ default: () => null }));
vi.mock("./TrialBanner", () => ({ TrialBanner: () => null }));

import DashboardLayout from "./DashboardLayout";
import { DashboardOverdueNotice } from "./OverdueNotice";
import AssinaturaPage from "@/pages/dashboard/AssinaturaPage";

/** Mesmo topo da Visão Geral: o aviso é o primeiro item do conteúdo. */
const OverviewTop = () => (
  <div>
    <DashboardOverdueNotice />
    <h1>Olá</h1>
  </div>
);

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<OverviewTop />} />
            <Route path="assinatura" element={<AssinaturaPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const LEGACY = /Regularize agora para não perder o acesso|Regularizar agora|Você tem acesso até/;

function expectSingleNoticeInContent(testId: "overdue-grace" | "overdue-blocked") {
  const alerts = screen.getAllByRole("alert");
  expect(alerts).toHaveLength(1);
  expect(alerts[0].getAttribute("data-testid")).toBe(testId);
  // Dentro da área de conteúdo, nunca ao lado da barra lateral.
  expect(screen.getByRole("main").contains(alerts[0])).toBe(true);
  expect(screen.queryByText(LEGACY)).toBeNull();
}

beforeEach(() => {
  inGrace = true;
});

describe("mensalidade vencida: um único aviso", () => {
  it("tolerância — Visão Geral", async () => {
    renderAt("/dashboard");
    await waitFor(() => expect(screen.getByTestId("overdue-grace")).toBeTruthy());
    expectSingleNoticeInContent("overdue-grace");
  });

  it("tolerância — tela de cobrança", async () => {
    renderAt("/dashboard/assinatura");
    await waitFor(() => expect(screen.getByTestId("overdue-grace")).toBeTruthy());
    expectSingleNoticeInContent("overdue-grace");
  });

  it("carência vencida (pausado) — tela de cobrança", async () => {
    inGrace = false;
    renderAt("/dashboard/assinatura");
    await waitFor(() => expect(screen.getByTestId("overdue-blocked")).toBeTruthy());
    expectSingleNoticeInContent("overdue-blocked");
  });
});
