/** P40 — retorno da reativação paga com dias restantes em /bem-vindo. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";

const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isAdmin: false }) }));
let subState: Record<string, unknown> = {};
vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => ({ refresh: vi.fn(), isLoading: false, ...subState }),
}));

import { createFromMock, type TableHandler } from "@/test/supabase-query-mock";

let row: Record<string, unknown> | null = null;
let onboarded = true;
const handlers: Record<string, TableHandler> = {
  user_roles: () => ({ data: null, error: null }),
  analysis_history: () => ({ data: [{ id: "a" }], error: null }),
  brand_settings: () => ({ data: { onboarding_completed_at: onboarded ? "2026-01-01" : null }, error: null }),
  assinaturas: () => ({ data: row, error: null }),
};
const fromMock = createFromMock(handlers);
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    from: (t: string) => fromMock(t),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null }) },
  },
}));

class IO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;

import BemVindoPage from "./BemVindoPage";

const VENC = "2026-11-27T02:59:59.999Z"; // 26/11 em Brasília
const setUrl = (q: string) => window.history.replaceState({}, "", `/bem-vindo${q}`);

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.reset();
  sessionStorage.clear();
  onboarded = true;
  subState = {};
  setUrl("?from=asaas&tipo=upgrade");
});

const resumeRow = (extra: Record<string, unknown>) => ({
  status: "ativo", asaas_subscription_id: "sub_1", data_vencimento: VENC,
  checkout_context: { resumePaidUntil: VENC }, ...extra,
});

describe("BemVindoPage — reativação com dias restantes", () => {
  it("plano maior: bloco 'Sua assinatura voltou' + linha extra, sem toast nem 'Pagamento confirmado'", async () => {
    row = resumeRow({ plano: "presenca", plano_pretendido: "influencia" });
    subState = { effectiveStatus: "ativo", plano: "presenca", planoPretendido: "influencia", dataVencimento: VENC };
    render(<BemVindoPage />);
    expect(await screen.findByText("Sua assinatura voltou")).toBeTruthy();
    expect(screen.getByText("Nada foi cobrado hoje. A primeira cobrança é em 26/11, e o plano Influência que você escolheu começa nessa data. Até lá, você continua no Presença.")).toBeTruthy();
    expect(screen.getByText("Quer usar o Influência agora? Na página de Assinatura você paga só a diferença dos dias que faltam.")).toBeTruthy();
    expect(screen.queryByText("Pagamento confirmado")).toBeNull();
    expect(screen.getByText("Acessar Dashboard")).toBeTruthy();
    fireEvent.click(screen.getByText("Ver minha assinatura"));
    expect(navigateMock).toHaveBeenCalledWith("/dashboard/assinatura");
    await new Promise((r) => setTimeout(r, 20));
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("mesmo plano: texto 'tudo segue como está', sem linha extra", async () => {
    row = resumeRow({ plano: "influencia", plano_pretendido: null });
    render(<BemVindoPage />);
    expect(await screen.findByText("Nada foi cobrado hoje. A primeira cobrança é em 26/11. Até lá, tudo segue como está.")).toBeTruthy();
    expect(screen.queryByText(/Quer usar o/)).toBeNull();
    expect(screen.queryByText("Pagamento confirmado")).toBeNull();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("espera: linha ainda cancelada mostra 'Confirmando seu cartão…', nunca 'Pagamento confirmado'", async () => {
    row = resumeRow({ status: "cancelado", plano: "presenca", plano_pretendido: "influencia" });
    render(<BemVindoPage />);
    expect(await screen.findByText("Confirmando seu cartão…")).toBeTruthy();
    expect(screen.queryByText("Pagamento confirmado")).toBeNull();
    expect(screen.queryByText("Sua assinatura voltou")).toBeNull();
  });
});

describe("BemVindoPage — outros fluxos mantêm o bloco genérico", () => {
  it("upgrade individual pago (sem resumePaidUntil): 'Pagamento confirmado'", async () => {
    row = { status: "ativo", asaas_subscription_id: "sub_1", plano: "autoridade", plano_pretendido: null, data_vencimento: VENC, checkout_context: null };
    render(<BemVindoPage />);
    expect(await screen.findByText("Pagamento confirmado")).toBeTruthy();
    expect(screen.queryByText("Ver minha assinatura")).toBeNull();
  });

  it("trial com cartão / reativação sem dias: 'Pagamento confirmado'", async () => {
    setUrl("?from=asaas");
    row = { status: "trial", asaas_subscription_id: "sub_1", plano: "presenca", checkout_context: { completed: true } };
    render(<BemVindoPage />);
    expect(await screen.findByText("Pagamento confirmado")).toBeTruthy();
  });

  it("conta nova (sem onboarding): jornada de boas-vindas", async () => {
    setUrl("?from=asaas");
    onboarded = false;
    row = { status: "ativo", asaas_subscription_id: "sub_1", plano: "presenca", checkout_context: null };
    render(<BemVindoPage />);
    await waitFor(() => expect(screen.getByText("Sua jornada começa aqui")).toBeTruthy());
  });
});
