/**
 * P26-fix2 — multa pendente no create-checkout: aviso FIXO com "Pagar multa"
 * nas quatro telas de contratação (nunca o toast), com a tela/modal aberta.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const invoke = vi.fn();
const sonner = vi.hoisted(() => {
  const fn = vi.fn() as unknown as ((...a: unknown[]) => void) & Record<string, ReturnType<typeof vi.fn>>;
  fn.error = vi.fn(); fn.info = vi.fn(); fn.success = vi.fn();
  return fn;
});
vi.mock("sonner", () => ({ toast: sonner }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/lib/access-cache", () => ({ invalidateAccessCache: () => {} }));

const session = { user: { id: "u1", email: "c@x.com", user_metadata: { display_name: "Cliente" } } };
vi.mock("@/integrations/supabase/client", () => {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit", "in"]) q[m] = () => q;
  // Linha de assinatura cancelada: a landing abre o modal de contratação.
  q.maybeSingle = async () => ({ data: { status: "cancelado", carencia_ate: null }, error: null });
  q.then = (r: (v: unknown) => unknown) => r({ data: [], error: null });
  return {
    supabase: {
      auth: {
        getSession: async () => ({ data: { session } }),
        getUser: async () => ({ data: { user: session.user } }),
      },
      from: () => q,
      functions: { invoke: (...a: unknown[]) => invoke(...a) },
    },
  };
});
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useInRouterContext: () => false,
  useSearchParams: () => [new URLSearchParams("")],
  Navigate: () => null,
}));
vi.mock("framer-motion", () => {
  const strip = ({ initial: _i, animate: _a, whileInView: _w, whileHover: _h, viewport: _v, transition: _t, variants: _va, exit: _e, ...p }: Record<string, unknown>) => p;
  const make = (tag: string) => (p: Record<string, unknown>) => React.createElement(tag, strip(p));
  return { motion: new Proxy({}, { get: (_t, tag: string) => make(tag) }), AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});
vi.mock("@/hooks/useAccountType", () => ({ useAccountType: () => accountType }));
let accountType = { accountType: "individual", agencyName: null, isLoading: false, isAgency: false };
vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => ({ plano: "presenca", isLoading: false, isAdmin: false, effectiveStatus: "trial_expirado", hasAsaasSubscription: false, cicloContratado: "mensal" }),
}));
vi.mock("@/hooks/useAuthUserId", () => ({ useAuthUserId: () => ({ userId: "u1" }) }));
vi.mock("@/hooks/useAgencyBrands", () => ({
  useAgencyBrands: () => ({ data: BRANDS, isLoading: false }),
}));
const BRANDS = [{ id: "b1", brand_name: "Marca 1", plano: null, plano_pretendido: "presenca" }];

import EscolherPlanoPage from "@/pages/EscolherPlanoPage";
import InvestSection from "@/components/landing/InvestSection";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import AgencyBillingPage from "@/pages/dashboard/AgencyBillingPage";

const BLOCKED = { data: { ok: false, reason: "multa_pendente", valor: 200, message: "x" }, error: null };

const expectFixedNotice = async () => {
  const notice = await screen.findByTestId("penalty-blocked-notice");
  expect(notice.textContent?.replace(/\u00a0/g, " ")).toContain("falta pagar a multa do cancelamento anterior: R$ 200,00");
  expect(screen.getByRole("button", { name: /Pagar multa/ })).toBeInTheDocument();
  // Nenhum toast para este caso.
  expect(sonner).not.toHaveBeenCalled();
};

beforeEach(() => {
  invoke.mockReset();
  (sonner as unknown as ReturnType<typeof vi.fn>).mockReset();
  accountType = { accountType: "individual", agencyName: null, isLoading: false, isAgency: false };
  Object.defineProperty(window, "location", { writable: true, value: { href: "" } as Location });
});

describe("aviso fixo de multa pendente (sem toast)", () => {
  it("EscolherPlanoPage: aviso dentro do modal, modal continua aberto", async () => {
    invoke.mockResolvedValue(BLOCKED);
    render(<EscolherPlanoPage />);
    const ctas = await screen.findAllByRole("button", { name: /Assinar|Começar|Contratar|Escolher/i });
    fireEvent.click(ctas[0]);
    fireEvent.click(await screen.findByRole("button", { name: /Assinar agora|Iniciar 7 dias grátis/ }));
    await expectFixedNotice();
    expect(screen.getByText("Confirmar assinatura")).toBeInTheDocument();
  });

  it("InvestSection: aviso dentro do modal, modal continua aberto", async () => {
    invoke.mockResolvedValue(BLOCKED);
    render(<InvestSection />);
    const ctas = await screen.findAllByRole("button", { name: /Assinar|Começar|Contratar|Escolher|Quero|Ativar|Ampliar|Dominar|Garantir/i });
    fireEvent.click(ctas[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Assinar agora" }));
    await expectFixedNotice();
    expect(screen.getByText("Confirmar assinatura")).toBeInTheDocument();
  });

  it("UpgradeModal: aviso dentro do modal, sem fechar", async () => {
    invoke.mockResolvedValue(BLOCKED);
    const onOpenChange = vi.fn();
    render(<UpgradeModal open onOpenChange={onOpenChange} intent="contratar" />);
    fireEvent.click(await screen.findByRole("button", { name: /Ampliar influência/i }));
    await expectFixedNotice();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("AgencyBillingPage: aviso logo acima do botão de ativar", async () => {
    accountType = { accountType: "agency", agencyName: "Ag", isLoading: false, isAgency: true };
    invoke.mockResolvedValue(BLOCKED);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AgencyBillingPage />
      </QueryClientProvider>,
    );
    const ativar = await screen.findByRole("button", { name: "Ativar assinatura da agência" });
    await waitFor(() => expect(ativar).not.toBeDisabled());
    fireEvent.click(ativar);
    await expectFixedNotice();
  });

  it("'Pagar multa' usa o fluxo existente (pay_penalty) e abre a fatura", async () => {
    invoke.mockResolvedValueOnce(BLOCKED).mockResolvedValueOnce({ data: { ok: true, invoiceUrl: "https://invoice.test/1" }, error: null });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" />);
    fireEvent.click(await screen.findByRole("button", { name: /Ampliar influência/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Pagar multa/ }));
    await waitFor(() => expect(invoke).toHaveBeenLastCalledWith("manage-subscription", { body: { action: "pay_penalty" } }));
    await waitFor(() => expect(open).toHaveBeenCalledWith("https://invoice.test/1", "_blank", "noopener"));
    open.mockRestore();
  });
});
