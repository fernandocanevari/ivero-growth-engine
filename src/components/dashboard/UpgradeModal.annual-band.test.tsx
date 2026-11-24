/** P49: faixa de compromisso do Anual e sub-linha do botão. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

const LINE = "No Anual você paga menos todo mês";
const SUCCESS = "Pronto, você agora está no plano anual! Seus 12 meses começaram hoje.";
const base = { plano: "presenca", isLoading: false, isAdmin: false, countedPaymentIds: [], multaPendente: null, dataVencimento: "2026-12-15T02:59:59.999Z" };
const paidMonthly = { ...base, effectiveStatus: "ativo", cicloContratado: "mensal", hasAsaasSubscription: true, ciclosPagos: 3, countedPaymentIds: ["p1", "p2", "p3"] };
const has = () => (document.body.textContent ?? "").includes(LINE);
// Só alterna o seletor Mensal/Anual (nenhuma compra, nenhuma chamada de rede).
const pickAnual = () => fireEvent.click(screen.getByRole("button", { name: /Anual/ }));

const OLD = "No Anual você paga menos por mês e fica 12 meses com a gente, contando a partir de hoje.";
const SUB = "12 meses, a partir de hoje";
const text = () => document.body.textContent ?? "";
const count = (t: string) => text().split(t).length - 1;

beforeEach(() => { invoke.mockReset(); toastMock.mockReset(); });

describe("P49 faixa do Anual", () => {
  const cases: Array<[string, string, string, string, string]> = [
    ["presenca", "Presença", "R$ 397", "R$ 497", "R$ 1.200"],
    ["influencia", "Influência", "R$ 717", "R$ 897", "R$ 2.160"],
    ["autoridade", "Autoridade", "R$ 1.197", "R$ 1.497", "R$ 3.600"],
  ];
  for (const [key, name, a, m, e] of cases) {
    it(`${key}: faixa antes dos cards, textos exatos, sub-linha única`, () => {
      statusMock = { ...paidMonthly, plano: key };
      render(<UpgradeModal open onOpenChange={() => {}} />);
      pickAnual();
      const band = screen.getByTestId("annual-commitment-band");
      const ps = band.querySelectorAll("p");
      expect(ps[0].textContent).toBe("No Anual você paga menos todo mês");
      const body = `Você fica 12 meses com a gente, contando a partir de hoje. No ${name}, você paga ${a} por mês em vez de ${m} e economiza ${e} por ano.`;
      expect(ps[1].textContent).toBe(body);
      console.log("BAND:", ps[1].textContent);
      expect(band.getAttribute("role")).toBe("status");
      const firstCard = screen.getAllByText("Presença")[0];
      expect(band.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(text()).toContain(`${a}`);
      expect(text()).toContain(`${e}`);
      expect(text().includes(OLD)).toBe(false);
      expect(count(SUB)).toBe(1);
      const btn = screen.getByRole("button", { name: "Passar para o anual" });
      expect(btn.parentElement?.textContent).toContain(SUB);
      expect(btn.className).toContain("bg-primary");
      expect(btn.className).not.toContain("border-input");
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
});
