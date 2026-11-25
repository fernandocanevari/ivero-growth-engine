/** P50: faixa de compromisso do Anual em uma única linha (simplificação do P49). */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

const invoke = vi.fn();
const toastMock = vi.fn();
let statusMock: Record<string, unknown>;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1", email: "c@x.com", user_metadata: {} } } }) },
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));
vi.mock("@/hooks/useSubscriptionStatus", () => ({ useSubscriptionStatus: () => statusMock }));
vi.mock("@/hooks/use-toast", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/hooks/useAccountType", () => ({
  useAccountType: () => ({ accountType: "individual", agencyName: null, isLoading: false, isAgency: false }),
}));

import { UpgradeModal } from "./UpgradeModal";

const TOAST_NEW = "Seu plano começa hoje.";
const base = { plano: "presenca", isLoading: false, isAdmin: false, countedPaymentIds: [], multaPendente: null, dataVencimento: "2026-12-15T02:59:59.999Z" };
const paidMonthly = { ...base, effectiveStatus: "ativo", cicloContratado: "mensal", hasAsaasSubscription: true, ciclosPagos: 3, countedPaymentIds: ["p1", "p2", "p3"] };
// Só alterna o seletor Mensal/Anual (nenhuma compra, nenhuma chamada de rede).
const pickAnual = () => fireEvent.click(screen.getByRole("button", { name: /Anual/ }));

// Textos que devem desaparecer do dialog inteiro.
const OLD_P47 = "No Anual você paga menos por mês e fica 12 meses com a gente, contando a partir de hoje.";
const OLD_P49_TITLE = "No Anual você paga menos todo mês";
const OLD_P49_BODY = "Você fica 12 meses com a gente, contando a partir de hoje.";
const SUB = "12 meses, a partir de hoje";
const text = () => document.body.textContent ?? "";
const count = (t: string) => text().split(t).length - 1;

beforeEach(() => { invoke.mockReset(); toastMock.mockReset(); });

describe("P50 faixa do Anual em uma linha", () => {
  const cases: Array<[string, string, string]> = [
    ["presenca", "Presença", "R$ 1.200"],
    ["influencia", "Influência", "R$ 2.160"],
    ["autoridade", "Autoridade", "R$ 3.600"],
  ];
  for (const [key, name, saving] of cases) {
    it(`${key}: uma única linha exata, sem preços, antes dos cards`, () => {
      statusMock = { ...paidMonthly, plano: key };
      render(<UpgradeModal open onOpenChange={() => {}} />);
      pickAnual();
      const band = screen.getByTestId("annual-commitment-band");
      const ps = band.querySelectorAll("p");
      expect(ps.length).toBe(1);
      const exact = `No ${name} economiza ${saving} por ano`;
      expect(ps[0].textContent).toBe(exact);
      expect(ps[0].className).toContain("text-base");
      expect(ps[0].className).toContain("font-medium");
      expect(ps[0].className).toContain("leading-relaxed");
      expect(band.getAttribute("role")).toBe("status");
      console.log("BAND:", ps[0].textContent);
      // Nenhum preço mensal/anual nem a frase de 12 meses dentro da faixa.
      const bandText = band.textContent ?? "";
      for (const forbidden of ["R$ 397", "R$ 497", "R$ 717", "R$ 897", "R$ 1.197", "R$ 1.497", "12 meses"]) {
        expect(bandText.includes(forbidden)).toBe(false);
      }
      // A faixa vem antes do primeiro card de plano.
      const firstCard = screen.getAllByText("Presença")[0];
      expect(band.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // Textos antigos ausentes do dialog inteiro.
      expect(text().includes(OLD_P47)).toBe(false);
      expect(text().includes(OLD_P49_TITLE)).toBe(false);
      expect(text().includes(OLD_P49_BODY)).toBe(false);
      expect(text().includes(TOAST_NEW)).toBe(false);
      // A sub-linha do botão continua uma única vez.
      expect(count(SUB)).toBe(1);
      const btn = screen.getByRole("button", { name: "Passar para o anual" });
      expect(btn.parentElement?.textContent).toContain(SUB);
    });
  }

  const negatives: Array<[string, Record<string, unknown>, boolean]> = [
    ["Mensal selecionado", paidMonthly, false],
    ["ativo anual", { ...paidMonthly, cicloContratado: "anual" }, true],
    ["trial", { ...base, effectiveStatus: "trial", cicloContratado: "mensal", hasAsaasSubscription: true, ciclosPagos: 0 }, true],
    ["trial vencido", { ...base, effectiveStatus: "trial_expirado", cicloContratado: "mensal", hasAsaasSubscription: false, ciclosPagos: 0 }, true],
    ["cancelado", { ...paidMonthly, effectiveStatus: "cancelado", hasAsaasSubscription: false }, true],
    ["ativo mensal 0 ciclos", { ...paidMonthly, ciclosPagos: 0, countedPaymentIds: [] }, true],
  ];
  for (const [label, s, pick] of negatives) {
    it(`${label}: sem faixa e sem sub-linha`, () => {
      statusMock = s;
      render(<UpgradeModal open onOpenChange={() => {}} />);
      if (pick && screen.queryByRole("button", { name: /Anual/ })) pickAnual();
      expect(screen.queryByTestId("annual-commitment-band")).toBeNull();
      expect(text().includes(SUB)).toBe(false);
      if (label === "ativo mensal 0 ciclos") expect(screen.getByRole("button", { name: "Passar para o anual" })).toBeTruthy();
    });
  }

  it("botão do P48 mantém as classes sólidas do plano destacado", () => {
    statusMock = paidMonthly;
    render(<UpgradeModal open onOpenChange={() => {}} />);
    pickAnual();
    const btn = screen.getByRole("button", { name: "Passar para o anual" });
    expect(btn.className).toContain("bg-primary");
    expect(btn.className).not.toContain("border-input");
  });
});
