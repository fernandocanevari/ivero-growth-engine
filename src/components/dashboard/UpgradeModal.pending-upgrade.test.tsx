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

const ATIVO = { plano: "presenca", isLoading: false, isAdmin: false, effectiveStatus: "ativo", hasAsaasSubscription: true, cicloContratado: "mensal" };
const PENDING = {
  ok: true, mode: "pending_payment", plano: "presenca", planoPendente: "influencia", ciclo: "mensal",
  diferenca: 266.67, dueDate: "2026-11-13", invoiceUrl: "https://asaas.test/i/dif",
};
const text = () => (document.body.textContent ?? "").replace(/\u00a0/g, " ");

beforeEach(() => {
  invoke.mockReset();
  toastMock.mockReset();
  statusMock = ATIVO;
});

async function pickInfluencia() {
  fireEvent.click(await screen.findByRole("button", { name: /Ampliar influência/i }));
}

describe("pending_payment → diálogo de confirmação", () => {
  it("(a,b) não abre a fatura sozinho, sem toast antigo, mostra título/valor/data", async () => {
    invoke.mockResolvedValue({ data: PENDING, error: null });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<UpgradeModal open onOpenChange={() => {}} />);
    await pickInfluencia();
    await screen.findByText("Pedido registrado");
    expect(open).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
    expect(text()).toContain(
      "Para liberar o plano Influência agora, você paga só a diferença dos dias que faltam: R$ 266,67, até 13/11.",
    );
    expect(text()).toContain("você continua no plano Presença, sem nenhuma outra cobrança.");
    fireEvent.click(screen.getByRole("button", { name: "Ir para o pagamento" }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("https://asaas.test/i/dif", "_blank", "noopener");
    await waitFor(() => expect(screen.queryByText("Pedido registrado")).toBeNull());
    open.mockRestore();
  });

  it("(a) Pagar depois fecha sem abrir nada", async () => {
    invoke.mockResolvedValue({ data: PENDING, error: null });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<UpgradeModal open onOpenChange={() => {}} />);
    await pickInfluencia();
    fireEvent.click(await screen.findByRole("button", { name: "Pagar depois" }));
    await waitFor(() => expect(screen.queryByText("Pedido registrado")).toBeNull());
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("(c) pedido reaproveitado com fatura mostra o mesmo diálogo com outro título", async () => {
    invoke.mockResolvedValue({ data: { ...PENDING, reused: true }, error: null });
    render(<UpgradeModal open onOpenChange={() => {}} />);
    await pickInfluencia();
    await screen.findByText("Você já tem um pedido em andamento");
    expect(text()).toContain("R$ 266,67, até 13/11");
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("(c) pedido_em_andamento sem fatura avisa e aponta para a página Assinatura", async () => {
    invoke.mockResolvedValue({ data: { ok: false, reason: "pedido_em_andamento", message: "Já existe um pedido." }, error: null });
    render(<UpgradeModal open onOpenChange={() => {}} />);
    await pickInfluencia();
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    const arg = toastMock.mock.calls[0][0] as { description: string };
    expect(arg.description).toBe("Já existe um pedido. Você acompanha o pedido na página Assinatura.");
    expect(invoke.mock.calls.some(([n]) => n === "create-checkout")).toBe(false);
  });

  it("(c) pedido_em_andamento com fatura mostra o diálogo", async () => {
    invoke.mockResolvedValue({ data: { ...PENDING, ok: false, reason: "pedido_em_andamento" }, error: null });
    render(<UpgradeModal open onOpenChange={() => {}} />);
    await pickInfluencia();
    await screen.findByText("Você já tem um pedido em andamento");
  });
});

describe("subtítulo e seletor de ciclo", () => {
  const NEW = "Se for um plano maior, ele vale assim que você pagar a diferença dos dias que faltam.";
  const OLD = "O ajuste vale a partir da sua próxima cobrança.";
  for (const st of ["ativo", "inadimplente"]) {
    it(`(g) ${st}: texto novo`, () => {
      statusMock = { ...ATIVO, effectiveStatus: st };
      render(<UpgradeModal open onOpenChange={() => {}} />);
      expect(text()).toContain(NEW);
    });
    it(`(h) ${st} anual: sem seletor Mensal/Anual`, () => {
      statusMock = { ...ATIVO, effectiveStatus: st, cicloContratado: "anual" };
      render(<UpgradeModal open onOpenChange={() => {}} />);
      expect(screen.queryByRole("button", { name: "Mensal" })).toBeNull();
    });
  }
  it("(P37 5b) cancelado: título e subtítulo de reativação", () => {
    statusMock = { ...ATIVO, effectiveStatus: "cancelado" };
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(text()).toContain("Reativar plano");
    expect(text()).toContain("Escolha o plano com que você quer voltar.");
    expect(text()).not.toContain(OLD);
  });
  for (const st of ["trial"]) {
    it(`(g) ${st}: texto de hoje`, () => {
      statusMock = { ...ATIVO, effectiveStatus: st };
      render(<UpgradeModal open onOpenChange={() => {}} />);
      expect(text()).toContain(OLD);
    });
  }
  it("(g) contratar: texto de contratação", () => {
    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" />);
    expect(text()).not.toContain(NEW);
    expect(text()).not.toContain(OLD);
  });
  it("(h) seletor visível para ativo mensal, trial anual e contratar", () => {
    const { unmount } = render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Mensal" })).toBeTruthy();
    unmount();
    statusMock = { ...ATIVO, effectiveStatus: "trial", cicloContratado: "anual" };
    const r2 = render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Mensal" })).toBeTruthy();
    r2.unmount();
    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" />);
    expect(screen.getByRole("button", { name: "Mensal" })).toBeTruthy();
  });
});

describe("P37 item 5", () => {
  it("(5a) ativo: card do plano atual mostra 'Seu plano atual' sem botão", () => {
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(screen.getByTestId("current-plan-label").textContent).toBe("Seu plano atual");
    expect(screen.queryByRole("button", { name: /Garantir presença/i })).toBeNull();
  });
  for (const st of ["cancelado", "trial", "inadimplente"]) {
    it(`(5a) ${st}: botão do plano atual continua`, () => {
      statusMock = { ...ATIVO, effectiveStatus: st };
      render(<UpgradeModal open onOpenChange={() => {}} />);
      expect(screen.queryByTestId("current-plan-label")).toBeNull();
      expect(screen.getByRole("button", { name: /Garantir presença/i })).toBeTruthy();
    });
  }
  it("(5c) contrato anual: rodapé de compromisso", () => {
    statusMock = { ...ATIVO, cicloContratado: "anual" };
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(text()).toContain("Cada plano inclui todos os recursos do anterior · Compromisso de 12 meses no preço promocional");
    expect(text()).not.toContain("Sem contrato");
  });
  it("(5c) mensal: rodapé de hoje", () => {
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(text()).toContain("Sem contrato · Cancele quando quiser");
  });
  it("(item 2) autoSelectPlan dispara o mesmo change_plan e abre 'Pedido registrado'", async () => {
    invoke.mockResolvedValue({ data: PENDING, error: null });
    render(<UpgradeModal open onOpenChange={() => {}} autoSelectPlan="influencia" />);
    await screen.findByText("Pedido registrado");
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0][0]).toBe("manage-subscription");
    expect((invoke.mock.calls[0][1] as { body: { action: string; plano: string } }).body).toMatchObject({ action: "change_plan", plano: "influencia" });
  });
});
