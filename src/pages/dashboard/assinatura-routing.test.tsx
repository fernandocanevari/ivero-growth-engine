/**
 * Guardas de rota da assinatura por tipo de conta.
 * Agência → sempre o faturamento consolidado (/dashboard/marcas/assinatura).
 * Individual → sempre a assinatura individual (/dashboard/assinatura).
 * Nenhum dos dois lados pode renderizar a página errada nem disparar
 * chamadas de faturas antes do redirecionamento.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

let account = { accountType: "agency", agencyName: "Ag", isLoading: false, isAgency: true };
const AGENCY = { accountType: "agency", agencyName: "Ag", isLoading: false, isAgency: true };
const INDIVIDUAL = { accountType: "individual", agencyName: null, isLoading: false, isAgency: false };

const invoke = vi.fn();

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
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    rpc: vi.fn(),
  },
}));
vi.mock("@/hooks/useAccountType", () => ({ useAccountType: () => account }));
vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => ({
    plano: "presenca", status: "trial", effectiveStatus: "trial", isLoading: false,
    isPaid: false, isTrial: true, refresh: vi.fn(), canceladoAcessoAte: null,
    dataVencimento: null, trialEndsAt: null, cicloContratado: "mensal",
    ciclosPagos: 0, compromissoMeses: 0,
  }),
}));
const listInvoices = vi.fn(() => ({ invoices: [], next: null, isLoading: false, reload: vi.fn() }));
vi.mock("@/hooks/useBillingInvoices", () => ({
  useBillingInvoices: () => listInvoices(),
  INVOICE_STATUS_LABEL: {},
}));
vi.mock("@/lib/reconcile-pending", () => ({ reconcilePendingPayment: async () => null }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/hooks/useAuthUserId", () => ({ useAuthUserId: () => ({ userId: "u1" }) }));
vi.mock("@/hooks/useAgencyBrands", () => ({
  useAgencyBrands: () => ({
    data: [
      { id: "b1", brand_name: "Marca Um", plano: null, plano_pretendido: null, onboarding_completed_at: "2026-01-01", website: null, score: 50, delta: null, vitrineTerms: 0 },
      { id: "b2", brand_name: "Marca Dois", plano: "presenca", plano_pretendido: null, onboarding_completed_at: "2026-01-01", website: null, score: 60, delta: null, vitrineTerms: 0 },
    ],
    isLoading: false,
  }),
  useSwitchBrand: () => vi.fn(),
  useActiveBrandId: () => "b1",
}));

import AssinaturaPage from "./AssinaturaPage";
import AgencyBillingPage from "./AgencyBillingPage";
import MarcasPage from "./MarcasPage";

const INDIVIDUAL_ROUTE = "/dashboard/assinatura";
const AGENCY_ROUTE = "/dashboard/marcas/assinatura";

function renderAt(start: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[start]}>
        <Routes>
          <Route path={INDIVIDUAL_ROUTE} element={<AssinaturaPage />} />
          <Route path={AGENCY_ROUTE} element={<AgencyBillingPage />} />
          <Route path="/dashboard/marcas" element={<MarcasPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  invoke.mockReset();
  listInvoices.mockClear();
});

describe("Guarda da AssinaturaPage (página individual)", () => {
  it("agência em /dashboard/assinatura cai no faturamento consolidado, sem flash nem list_invoices", async () => {
    account = AGENCY;
    renderAt(INDIVIDUAL_ROUTE);
    expect(await screen.findByTestId("agency-quote")).toBeTruthy();
    expect(listInvoices).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("individual em /dashboard/assinatura vê a página individual normalmente", async () => {
    account = INDIVIDUAL;
    renderAt(INDIVIDUAL_ROUTE);
    expect(await screen.findByText(/Próxima cobrança/i)).toBeTruthy();
    expect(screen.queryByTestId("agency-quote")).toBeNull();
  });
});

describe("Guarda da AgencyBillingPage (faturamento consolidado)", () => {
  it("individual em /dashboard/marcas/assinatura cai na assinatura individual", async () => {
    account = INDIVIDUAL;
    renderAt(AGENCY_ROUTE);
    expect(await screen.findByText(/Próxima cobrança/i)).toBeTruthy();
    expect(screen.queryByTestId("agency-quote")).toBeNull();
  });

  it("agência em /dashboard/marcas/assinatura vê o faturamento consolidado", async () => {
    account = AGENCY;
    renderAt(AGENCY_ROUTE);
    expect(await screen.findByTestId("agency-quote")).toBeTruthy();
  });
});

describe("MarcasPage", () => {
  it("não renderiza o botão 'Assinatura' do topo, mas mantém o banner 'Escolher planos'", async () => {
    account = AGENCY;
    renderAt("/dashboard/marcas");
    expect(await screen.findByText("Visão Geral das Marcas")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Assinatura$/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Escolher planos/i })).toBeTruthy();
  });
});
