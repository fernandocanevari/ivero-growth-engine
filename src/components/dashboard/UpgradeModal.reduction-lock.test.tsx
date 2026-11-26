/** P38: anual em compromisso não reduz o plano sozinho — cards menores viram "Falar com a gente". */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const invoke = vi.fn();
let statusMock: Record<string, unknown>;
let email: string | null = "cliente@x.com";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: email ? { id: "u1", email, user_metadata: {} } : null } }) },
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));
vi.mock("@/hooks/useSubscriptionStatus", () => ({ useSubscriptionStatus: () => statusMock }));
vi.mock("@/hooks/use-toast", () => ({ toast: () => {} }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/hooks/useAccountType", () => ({
  useAccountType: () => ({ accountType: "individual", agencyName: null, isLoading: false, isAgency: false }),
}));

import { UpgradeModal } from "./UpgradeModal";

const NOTE = "Seu contrato tem compromisso de 12 meses. Para reduzir o plano, fale com a gente.";
const base = { isLoading: false, isAdmin: false, countedPaymentIds: ["p1"], multaPendente: null, dataVencimento: "2026-12-15T02:59:59.999Z", hasAsaasSubscription: true, compromissoMeses: 12 };
const committed = { ...base, plano: "autoridade", effectiveStatus: "ativo", cicloContratado: "anual", ciclosPagos: 1 };
const wa = (msg: string) => `https://wa.me/5514999043105?text=${encodeURIComponent(msg)}`;

beforeEach(() => { invoke.mockReset(); invoke.mockResolvedValue({ data: { ok: true, mode: "asaas" }, error: null }); email = "cliente@x.com"; });

describe("P38 bloqueio de redução no anual em compromisso", () => {
  it("(i) Autoridade anual: Presença e Influência travados, frase única, link wa.me, zero change_plan", async () => {
    statusMock = committed;
    render(<UpgradeModal open onOpenChange={() => {}} />);
    const links = screen.getAllByRole("link", { name: /Falar com a gente/ });
    expect(links).toHaveLength(2);
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    const pres = screen.getByTestId("locked-reduction-presenca");
    await waitFor(() =>
      expect(pres.getAttribute("href")).toBe(wa("Olá! Quero reduzir meu plano de Autoridade para Presença. Minha conta: cliente@x.com")),
    );
    expect(screen.getByTestId("locked-reduction-influencia").getAttribute("href")).toBe(
      wa("Olá! Quero reduzir meu plano de Autoridade para Influência. Minha conta: cliente@x.com"),
    );
    expect(pres.getAttribute("target")).toBe("_blank");
    expect(pres.getAttribute("rel")).toBe("noopener noreferrer");
    expect(pres.querySelector("svg")).toBeTruthy();
    fireEvent.click(pres);
    fireEvent.click(screen.getByTestId("locked-reduction-influencia"));
    expect(invoke).not.toHaveBeenCalled();
  });

  it("(i) inadimplente e sem e-mail: trava e omite a última frase", async () => {
    email = null;
    statusMock = { ...committed, plano: "influencia", effectiveStatus: "inadimplente" };
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(screen.getAllByRole("link", { name: /Falar com a gente/ })).toHaveLength(1);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByTestId("locked-reduction-presenca").getAttribute("href")).toBe(
      wa("Olá! Quero reduzir meu plano de Influência para Presença."),
    );
  });

  it("(j) plano maior continua chamando change_plan; plano atual mostra o rótulo", async () => {
    statusMock = { ...committed, plano: "influencia" };
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(screen.getByTestId("current-plan-label")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Consolidar autoridade/ }));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke.mock.calls[0][1].body).toMatchObject({ action: "change_plan", plano: "autoridade" });
  });

  const others: Array<[string, Record<string, unknown>]> = [
    ["mensal", { ...committed, cicloContratado: "mensal" }],
    ["anual com compromisso cumprido", { ...committed, ciclosPagos: 12 }],
    ["trial", { ...committed, effectiveStatus: "trial", ciclosPagos: 0 }],
    ["cancelado", { ...committed, effectiveStatus: "cancelado" }],
  ];
  for (const [label, s] of others) {
    it(`(k) ${label}: sem cadeado e sem a frase`, () => {
      statusMock = s;
      render(<UpgradeModal open onOpenChange={() => {}} />);
      expect(screen.queryByRole("link", { name: /Falar com a gente/ })).toBeNull();
      expect(screen.queryByText(NOTE)).toBeNull();
      expect(screen.getByRole("button", { name: /Garantir presença/ })).toBeTruthy();
    });
  }
});
