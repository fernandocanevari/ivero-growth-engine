/** Pedido de upgrade: diálogo de confirmação, subtítulo e seletor de ciclo. */
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

/** P39-fix1: rodapé, aba destacada e preços seguem o mesmo ciclo visível desde o 1º render. */
const ANUAL_TXT = "✦ Cada plano inclui todos os recursos do anterior · Compromisso de 12 meses no preço promocional, renovado a cada ano";
const MENSAL_TXT = "✦ Cada plano inclui todos os recursos do anterior · Sem contrato · Cancele quando quiser";
const text = () => (document.body.textContent ?? "").replace(/\u00a0/g, " ");
const base = { plano: "influencia", isLoading: false, isAdmin: false, ciclosPagos: 0, countedPaymentIds: [], multaPendente: null };
const future = "2026-12-15T02:59:59.999Z";

const STATES: Array<[string, Record<string, unknown>, "anual" | "mensal", boolean]> = [
  ["1 cancelado anual, dias restantes, sub antigo", { effectiveStatus: "cancelado", cicloContratado: "anual", hasAsaasSubscription: true, asaasSubscriptionId: "sub_old", dataVencimento: future, ciclosPagos: 2 }, "anual", false],
  ["2 cancelado anual, sem sub", { effectiveStatus: "cancelado", cicloContratado: "anual", hasAsaasSubscription: false, dataVencimento: future }, "anual", false],
  ["3 cancelado mensal", { effectiveStatus: "cancelado", cicloContratado: "mensal", hasAsaasSubscription: false, dataVencimento: future }, "mensal", false],
  ["4 trial", { effectiveStatus: "trial", plano: "presenca", cicloContratado: "mensal", hasAsaasSubscription: false }, "mensal", false],
  ["5 ativo mensal", { effectiveStatus: "ativo", cicloContratado: "mensal", hasAsaasSubscription: true }, "mensal", false],
  ["6 ativo anual (lockAnnual)", { effectiveStatus: "ativo", cicloContratado: "anual", hasAsaasSubscription: true }, "anual", true],
  ["7 trial expirado", { effectiveStatus: "expirado", plano: "presenca", cicloContratado: "mensal", hasAsaasSubscription: false }, "mensal", false],
];

function tab(name: RegExp) {
  return screen.getAllByRole("button").find((b) => name.test(b.textContent ?? "") && b.className.includes("rounded-full") && b.className.includes("px-4"));
}
function assertCycle(c: "anual" | "mensal", locked: boolean) {
  const t = text();
  if (c === "anual") {
    expect(t).toContain("R$ 717");
    expect(t).not.toContain("R$ 897");
    expect(t).toContain(ANUAL_TXT);
    expect(t).not.toContain("Sem contrato");
  } else {
    expect(t).toContain("R$ 897");
    expect(t).not.toContain("R$ 717");
    expect(t).toContain(MENSAL_TXT);
    expect(t).not.toContain("Compromisso de 12 meses");
  }
  if (locked) { expect(tab(/^Mensal$/)).toBeUndefined(); return; }
  const on = c === "anual" ? tab(/^Anual/) : tab(/^Mensal$/);
  const off = c === "anual" ? tab(/^Mensal$/) : tab(/^Anual/);
  expect(on!.className).toContain("bg-background");
  expect(off!.className).not.toContain("bg-background");
}

describe("P39-fix1 rodapé segue o ciclo visível sem clique", () => {
  for (const [name, s, def, locked] of STATES) {
    it(name, () => {
      statusMock = { ...base, ...s };
      render(<UpgradeModal open onOpenChange={() => {}} />);
      assertCycle(def, locked);
      if (locked) return;
      fireEvent.click(tab(/^Mensal$/)!);
      assertCycle("mensal", false);
      fireEvent.click(tab(/^Anual/)!);
      assertCycle("anual", false);
    });
  }
});
