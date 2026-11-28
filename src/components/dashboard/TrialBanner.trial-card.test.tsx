/**
 * P61 — TrialBanner para trial que já cadastrou o cartão (finding 84).
 * O UpgradeModal é mockado e expõe o intent recebido quando aberto.
 * Agência: já coberto em upgrade-entry.agency.test.tsx (não duplicado).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) }, functions: { invoke: vi.fn() } },
}));
vi.mock("@/hooks/useAccountType", () => ({
  useAccountType: () => ({ accountType: "individual", agencyName: null, isLoading: false, isAgency: false }),
}));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("./UpgradeModal", () => ({
  UpgradeModal: ({ open, intent }: { open: boolean; intent: string }) =>
    open ? <div data-testid="modal-intent">{intent}</div> : null,
}));

import { TrialBanner } from "./TrialBanner";
import { formatDateBR } from "@/lib/date-display";

const H = 36e5;
const at = (h: number) => new Date(Date.now() + h * H).toISOString();
const mount = (props: Partial<React.ComponentProps<typeof TrialBanner>>) =>
  render(<MemoryRouter><TrialBanner userId="u1" plano="presenca" isTrial {...props} /></MemoryRouter>);

beforeEach(() => sessionStorage.clear());

describe("TrialBanner — trial com cartão", () => {
  it("5 dias: nota com data, pill e 'Mudar plano'", () => {
    const end = at(5 * 24 - 1);
    mount({ trialEndsAt: end, hasCard: true });
    expect(screen.getByText("Teste grátis por 7 dias")).toBeTruthy();
    expect(screen.getByText("5 de 7 dias restantes")).toBeTruthy();
    const note = screen.getByTestId("trial-banner-card-note");
    expect(note.textContent).toContain("cartão cadastrado, primeira cobrança em");
    expect(note.textContent).toContain(formatDateBR(end).slice(0, 5));
    expect(screen.getByRole("button", { name: "Mudar plano" })).toBeTruthy();
    expect(screen.queryByText("Ver planos")).toBeNull();
    expect(screen.queryByText("Assinar agora")).toBeNull();
  });

  it("36h: pill em horas, 'Mudar plano', nota presente", () => {
    mount({ trialEndsAt: at(36), hasCard: true });
    expect(screen.getByText("36h restantes")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mudar plano" })).toBeTruthy();
    expect(screen.queryByText("Assinar agora")).toBeNull();
    expect(screen.getByTestId("trial-banner-card-note")).toBeTruthy();
  });

  it("clique em 'Mudar plano' abre o modal com intent trocar_plano", () => {
    mount({ trialEndsAt: at(100), hasCard: true });
    fireEvent.click(screen.getByRole("button", { name: "Mudar plano" }));
    expect(screen.getByTestId("modal-intent").textContent).toBe("trocar_plano");
  });

  it("sem cartão: 'Ver planos', texto antigo, intent contratar; 48h 'Assinar agora'", () => {
    const { unmount } = mount({ trialEndsAt: at(100) });
    expect(screen.getByText(/acesso completo aos recursos do plano/)).toBeTruthy();
    expect(screen.queryByTestId("trial-banner-card-note")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ver planos" }));
    expect(screen.getByTestId("modal-intent").textContent).toBe("contratar");
    unmount();
    mount({ trialEndsAt: at(36), hasCard: false });
    expect(screen.getByRole("button", { name: "Assinar agora" })).toBeTruthy();
  });

  it("expirado com cartão: 'Assinar agora', sem dispensar, intent contratar", () => {
    mount({ trialEndsAt: at(-24), hasCard: true, isTrialExpired: true });
    const btn = screen.getByRole("button", { name: "Assinar agora" });
    expect(btn.className).toContain("destructive");
    expect(screen.queryByLabelText("Dispensar aviso")).toBeNull();
    fireEvent.click(btn);
    expect(screen.getByTestId("modal-intent").textContent).toBe("contratar");
  });

  it("com cartão: X dispensa na sessão", () => {
    mount({ trialEndsAt: at(100), hasCard: true });
    fireEvent.click(screen.getByLabelText("Dispensar aviso"));
    expect(sessionStorage.getItem("ivero_trial_banner_dismissed:u1")).toBe("1");
  });
});
