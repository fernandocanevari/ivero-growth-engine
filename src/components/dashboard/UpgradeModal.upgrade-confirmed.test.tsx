/** P54: diferença paga com o diálogo "Pedido registrado" aberto. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const invoke = vi.fn();
let statusMock: Record<string, unknown>;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1", email: "c@x.com", user_metadata: {} } } }) },
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

const ATIVO = { plano: "presenca", isLoading: false, isAdmin: false, effectiveStatus: "ativo", hasAsaasSubscription: true, cicloContratado: "mensal" };
const PENDING = {
  ok: true, mode: "pending_payment", plano: "presenca", planoPendente: "influencia", ciclo: "mensal",
  diferenca: 266.67, dueDate: "2026-11-13", invoiceUrl: "https://asaas.test/i/dif",
};
const text = () => (document.body.textContent ?? "").replace(/\u00a0/g, " ");
const ui = () => <UpgradeModal open onOpenChange={() => {}} />;

beforeEach(() => {
  invoke.mockReset();
  statusMock = { ...ATIVO };
});

async function openDialog(data: Record<string, unknown>, title: string) {
  invoke.mockResolvedValue({ data, error: null });
  const r = render(ui());
  fireEvent.click(await screen.findByRole("button", { name: /Ampliar influência/i }));
  await screen.findByText(title);
  return r;
}

for (const [label, data, title] of [
  ["novo pedido", PENDING, "Pedido registrado"],
  ["pedido reaproveitado", { ...PENDING, reused: true }, "Você já tem um pedido em andamento"],
] as const) {
  it(`${label}: plano vira o pedido → "Deu tudo certo!" e "Ótimo" fecha`, async () => {
    const { rerender } = await openDialog(data, title);
    statusMock = { ...ATIVO, plano: "influencia" };
    rerender(ui());
    await screen.findByText("Deu tudo certo!");
    expect(text()).toContain("Seu pagamento foi confirmado e o plano Influência já está liberado. Aproveite!");
    expect(text()).not.toContain("você continua no plano Presença");
    expect(screen.queryByRole("button", { name: "Pagar depois" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ir para o pagamento" })).toBeNull();
    expect(text()).not.toContain("bordo");
    fireEvent.click(screen.getByRole("button", { name: "Ótimo" }));
    await waitFor(() => expect(screen.queryByText("Deu tudo certo!")).toBeNull());
  });
}

it("Pagar depois antes da mudança: nada aparece depois", async () => {
  const { rerender } = await openDialog(PENDING, "Pedido registrado");
  fireEvent.click(screen.getByRole("button", { name: "Pagar depois" }));
  await waitFor(() => expect(screen.queryByText("Pedido registrado")).toBeNull());
  statusMock = { ...ATIVO, plano: "influencia" };
  rerender(ui());
  expect(screen.queryByText("Deu tudo certo!")).toBeNull();
  expect(screen.queryByRole("button", { name: "Ótimo" })).toBeNull();
});

it("plano muda para outro que não o pedido: diálogo original fica", async () => {
  const { rerender } = await openDialog(PENDING, "Pedido registrado");
  statusMock = { ...ATIVO, plano: "autoridade" };
  rerender(ui());
  expect(screen.getByText("Pedido registrado")).toBeTruthy();
  expect(screen.queryByText("Deu tudo certo!")).toBeNull();
  expect(screen.getByRole("button", { name: "Ir para o pagamento" })).toBeTruthy();
});

it("plano igual no rerender: diálogo original fica, sem 'bordo'", async () => {
  const { rerender } = await openDialog(PENDING, "Pedido registrado");
  rerender(ui());
  expect(screen.getByText("Pedido registrado")).toBeTruthy();
  expect(text()).toContain("você continua no plano Presença");
  expect(screen.queryByText("Deu tudo certo!")).toBeNull();
  expect(text()).not.toContain("bordo");
});
