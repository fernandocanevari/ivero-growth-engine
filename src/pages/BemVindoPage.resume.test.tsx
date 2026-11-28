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
let rows: Array<Record<string, unknown>> | null = null;
let onboarded = true;
const handlers: Record<string, TableHandler> = {
  user_roles: () => ({ data: null, error: null }),
  analysis_history: () => ({ data: [{ id: "a" }], error: null }),
  brand_settings: () => ({ data: { onboarding_completed_at: onboarded ? "2026-01-01" : null }, error: null }),
  assinaturas: () => ({ data: rows && rows.length ? (rows.length > 1 ? rows.shift()! : rows[0]) : row, error: null }),
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

// Linha REAL de cliente73 (20/11), após o webhook limpar resumePaidUntil.
const REAL = {
  status: "ativo", plano: "presenca", plano_pretendido: "influencia", ciclo_contratado: "anual",
  ciclos_pagos: 0, data_vencimento: "2026-11-27 00:58:16.326+00", asaas_subscription_id: "sub_real",
  upgrade_pendente_plano: null, checkout_context: null,
};
const setUrl = (q: string) => window.history.replaceState({}, "", `/bem-vindo${q}`);
const FLAG = "?from=asaas&tipo=upgrade&retomada=1";

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.reset();
  sessionStorage.clear();
  onboarded = true;
  rows = null;
  subState = { effectiveStatus: "ativo", plano: "presenca", planoPretendido: "influencia", dataVencimento: REAL.data_vencimento };
  setUrl(FLAG);
});

const BODY_HIGHER = "A primeira cobrança é em 26/11. Até lá, você continua no Presença.";
const noStars = (c: HTMLElement) =>
  expect(c.querySelector(".lucide-sparkles, .lucide-stars, .lucide-star, .lucide-wand, .lucide-wand-sparkles")).toBeNull();

describe("BemVindoPage — reativação (?retomada=1)", () => {
  it("plano maior (cliente73): selo, frase, 3 blocos, convite e dois botões, sem toast", async () => {
    row = REAL;
    const { container } = render(<BemVindoPage />);
    expect(await screen.findByText("Sua assinatura voltou")).toBeTruthy();
    expect(screen.getByTestId("resume-pill").textContent).toBe("Nada foi cobrado hoje");
    expect(screen.getByText(BODY_HIGHER)).toBeTruthy();
    expect(screen.queryByText(/27\/11/)).toBeNull();
    expect(screen.getByTestId("resume-block-atual").textContent).toBe("Seu plano hojePresença");
    expect(screen.getByTestId("resume-block-escolhido").textContent).toBe("Plano escolhidoInfluência");
    expect(screen.getByTestId("resume-block-inicio").textContent).toBe("Começa em26/11");
    expect(screen.getByText("Dá para começar agora")).toBeTruthy();
    expect(screen.getByText("Quer usar o Influência já?")).toBeTruthy();
    expect(screen.queryByText(/Na página de Assinatura/)).toBeNull();
    expect(screen.queryByText("Ver minha assinatura")).toBeNull();
    expect(screen.queryByText("Pagamento confirmado")).toBeNull();
    noStars(container);
    fireEvent.click(screen.getByRole("button", { name: "Já quero usar o plano Influência" }));
    expect(navigateMock).toHaveBeenCalledWith("/dashboard/assinatura");
    fireEvent.click(screen.getByRole("button", { name: "Acessar Dashboard" }));
    expect(navigateMock).toHaveBeenCalledWith("/dashboard");
    await new Promise((r) => setTimeout(r, 20));
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("sequência cancelado → ativo (sem marca): espera e depois conteúdo final", async () => {
    rows = [{ ...REAL, status: "cancelado", checkout_context: { resumePaidUntil: REAL.data_vencimento } }, REAL];
    render(<BemVindoPage />);
    expect(await screen.findByText("Confirmando seu cartão…")).toBeTruthy();
    expect(screen.queryByText("Pagamento confirmado")).toBeNull();
    expect(await screen.findByText("Sua assinatura voltou", {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText(BODY_HIGHER)).toBeTruthy();
  }, 10000);

  it("mesmo plano: sem blocos nem convite, Dashboard principal e link da assinatura", async () => {
    row = { ...REAL, plano: "influencia", plano_pretendido: null };
    const { container } = render(<BemVindoPage />);
    expect(await screen.findByText("A primeira cobrança é em 26/11. Até lá, tudo segue como está.")).toBeTruthy();
    expect(screen.getByText("Nada foi cobrado hoje")).toBeTruthy();
    expect(screen.queryByTestId("resume-block-atual")).toBeNull();
    expect(screen.queryByTestId("resume-invite")).toBeNull();
    expect(screen.getByRole("button", { name: "Acessar Dashboard" })).toBeTruthy();
    noStars(container);
    fireEvent.click(screen.getByText("Ver minha assinatura"));
    expect(navigateMock).toHaveBeenCalledWith("/dashboard/assinatura");
  });

  it("plano menor: blocos, sem convite", async () => {
    row = { ...REAL, plano: "autoridade", plano_pretendido: "presenca" };
    render(<BemVindoPage />);
    expect(await screen.findByText("A primeira cobrança é em 26/11. Até lá, você continua no Autoridade.")).toBeTruthy();
    expect(screen.getByTestId("resume-block-escolhido").textContent).toBe("Plano escolhidoPresença");
    expect(screen.queryByTestId("resume-invite")).toBeNull();
    expect(screen.getByText("Ver minha assinatura")).toBeTruthy();
  });

  it("ciclos_pagos > 0 com a flag: bloco genérico", async () => {
    row = { ...REAL, ciclos_pagos: 1 };
    render(<BemVindoPage />);
    expect(await screen.findByText("Pagamento confirmado")).toBeTruthy();
    expect(screen.queryByText("Sua assinatura voltou")).toBeNull();
  });

  it("tempo esgotado: texto novo, sem 'Reabrir pagamento'", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    sessionStorage.setItem("ivero_checkout_url", "https://checkout.invalid/x");
    row = { ...REAL, status: "cancelado" };
    render(<BemVindoPage />);
    for (let i = 0; i < 25; i++) await vi.advanceTimersByTimeAsync(3000);
    vi.useRealTimers();
    expect(await screen.findByText("Ainda estamos confirmando seu cartão. Isso pode levar alguns instantes.")).toBeTruthy();
    expect(screen.getByText("Verificar novamente")).toBeTruthy();
    expect(screen.getByText("Ir para o Dashboard")).toBeTruthy();
    expect(screen.queryByText("Reabrir pagamento")).toBeNull();
    expect(screen.queryByText(/pagamento/i)).toBeNull();
  });
});

describe("BemVindoPage — sem a flag, como antes do P40", () => {
  it("mesma linha real sem flag: bloco genérico e toast antigo", async () => {
    setUrl("?from=asaas&tipo=upgrade");
    row = REAL;
    render(<BemVindoPage />);
    expect(await screen.findByText("Pagamento confirmado")).toBeTruthy();
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock.mock.calls[0][0].description).toBe("Pronto, sua assinatura voltou. Nada foi cobrado hoje. A primeira cobrança é em 26/11, e o Influência que você escolheu começa nessa data.");
  });

  it("linha com resumePaidUntil mas sem flag: bloco genérico", async () => {
    setUrl("?from=asaas&tipo=upgrade");
    row = { ...REAL, checkout_context: { resumePaidUntil: REAL.data_vencimento } };
    render(<BemVindoPage />);
    expect(await screen.findByText("Pagamento confirmado")).toBeTruthy();
  });

  it("trial com cartão: 'Pagamento confirmado'", async () => {
    setUrl("?from=asaas");
    row = { status: "trial", asaas_subscription_id: "sub_1", plano: "presenca", checkout_context: { completed: true } };
    subState = {};
    render(<BemVindoPage />);
    expect(await screen.findByText("Cartão cadastrado")).toBeTruthy();
  });

  it("conta nova: jornada", async () => {
    setUrl("?from=asaas");
    onboarded = false;
    subState = {};
    row = { status: "ativo", asaas_subscription_id: "sub_1", plano: "presenca", checkout_context: null };
    render(<BemVindoPage />);
    await waitFor(() => expect(screen.getByText("Sua jornada começa aqui")).toBeTruthy());
  });
});
