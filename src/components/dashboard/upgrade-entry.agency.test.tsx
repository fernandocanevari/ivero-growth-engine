/**
 * Pontos de entrada de upgrade × tipo de conta.
 * Agência → /dashboard/marcas/assinatura, nunca change_plan nem create-checkout.
 * Individual → abre o UpgradeModal como antes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, renderHook, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";

const invoke = vi.fn();
let account = { accountType: "agency", agencyName: "Ag", isLoading: false, isAgency: true };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1", email: "a@x.com", user_metadata: {} } } }) },
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));
vi.mock("@/hooks/useAccountType", () => ({ useAccountType: () => account }));
vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => ({
    plano: "presenca", isLoading: false, isAdmin: false, effectiveStatus: "trial",
    hasAsaasSubscription: false, cicloContratado: "mensal",
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));

import { TrialBanner } from "./TrialBanner";
import { TrialLockedPage } from "./TrialLockedPage";
import { UpgradeModal } from "./UpgradeModal";
import { useUpgradeEntry, AGENCY_BILLING_PATH } from "@/hooks/useUpgradeEntry";

const AGENCY = { accountType: "agency", agencyName: "Ag", isLoading: false, isAgency: true };
const INDIVIDUAL = { accountType: "individual", agencyName: null, isLoading: false, isAgency: false };

function withRouter(ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<>{ui}</>} />
        <Route path={AGENCY_BILLING_PATH} element={<div>PAGINA_FATURAMENTO_AGENCIA</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const future = new Date(Date.now() + 3 * 864e5).toISOString();
const past = new Date(Date.now() - 864e5).toISOString();

beforeEach(() => {
  invoke.mockReset();
  sessionStorage.clear();
});

describe("Agência — todo ponto de entrada vai ao faturamento consolidado", () => {
  beforeEach(() => { account = AGENCY; });

  it("TrialBanner 'Ver planos'", async () => {
    withRouter(<TrialBanner userId="u1" plano="presenca" trialEndsAt={future} isTrial />);
    fireEvent.click(await screen.findByRole("button", { name: /Ver planos/i }));
    expect(await screen.findByText("PAGINA_FATURAMENTO_AGENCIA")).toBeTruthy();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("TrialBanner 'Assinar agora' (trial vencido)", async () => {
    withRouter(<TrialBanner userId="u1" plano="presenca" trialEndsAt={past} isTrial isTrialExpired />);
    fireEvent.click(await screen.findByRole("button", { name: /Assinar agora/i }));
    expect(await screen.findByText("PAGINA_FATURAMENTO_AGENCIA")).toBeTruthy();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("TrialLockedPage 'Fazer upgrade'", async () => {
    withRouter(<TrialLockedPage title="Plano de Ação" description="x" requiredTier="autoridade" />);
    fireEvent.click(await screen.findByRole("button", { name: /Fazer upgrade/i }));
    expect(await screen.findByText("PAGINA_FATURAMENTO_AGENCIA")).toBeTruthy();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("hook usado por Visibilidade IA, Gerador (cota esgotada) e Assinatura não abre o modal", () => {
    const openModal = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    );
    const { result } = renderHook(() => useUpgradeEntry(openModal), { wrapper });
    act(() => result.current.openUpgrade());
    expect(openModal).not.toHaveBeenCalled();
  });

  it("defesa: UpgradeModal aberto em agência mostra aviso e nunca chama change_plan", async () => {
    withRouter(<UpgradeModal open onOpenChange={() => {}} />);
    expect(await screen.findByText(/definidos por marca/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Ampliar influência/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Ir para planos das marcas/i }));
    expect(await screen.findByText("PAGINA_FATURAMENTO_AGENCIA")).toBeTruthy();
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe("Individual — continua abrindo o UpgradeModal", () => {
  beforeEach(() => { account = INDIVIDUAL; });

  it("TrialBanner abre o modal de planos", async () => {
    withRouter(<TrialBanner userId="u1" plano="presenca" trialEndsAt={future} isTrial />);
    fireEvent.click(await screen.findByRole("button", { name: /Ver planos/i }));
    expect(await screen.findByRole("button", { name: /Ampliar influência/i })).toBeTruthy();
    expect(screen.queryByText("PAGINA_FATURAMENTO_AGENCIA")).toBeNull();
  });

  it("hook chama o modal", () => {
    const openModal = vi.fn();
    const { result } = renderHook(() => useUpgradeEntry(openModal), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    act(() => result.current.openUpgrade());
    expect(openModal).toHaveBeenCalledTimes(1);
  });
});

void waitFor;
