/** P22: pedido do CPF/CNPJ antes do create-checkout (UpgradeModal). */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const invoke = vi.fn();
const toastMock = vi.fn();
let storedDoc: string | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1", email: "conta@x.com", user_metadata: {} } } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { cpf_cnpj: storedDoc, celular: "11987654321", cep: "01310100", logradouro: "Avenida Paulista", numero_endereco: "10", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP" } }) }) }) }),
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));
vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => ({ plano: "presenca", isLoading: false, isAdmin: false, effectiveStatus: "trial_expirado", hasAsaasSubscription: false, cicloContratado: "mensal" }),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/hooks/useAccountType", () => ({
  useAccountType: () => ({ accountType: "individual", agencyName: null, isLoading: false, isAgency: false }),
}));

import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { CPF_DIALOG_COPY } from "./CpfCnpjDialog";

beforeEach(() => {
  invoke.mockReset();
  toastMock.mockReset();
  storedDoc = null;
  Object.defineProperty(window, "location", { writable: true, value: { href: "" } as Location });
});

const clickPlano = async () => fireEvent.click(await screen.findByRole("button", { name: /Ampliar influência/i }));

describe("CpfCnpjDialog no UpgradeModal", () => {
  it("sem documento no perfil: pede antes, envia só os dígitos e abre o pagamento", async () => {
    invoke.mockResolvedValue({ data: { checkoutUrl: "https://asaas.test/c/1" }, error: null });
    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" />);
    await clickPlano();
    expect(await screen.findByText(CPF_DIALOG_COPY.title)).toBeTruthy();
    expect(invoke).not.toHaveBeenCalled();
    const input = screen.getByLabelText(CPF_DIALOG_COPY.label);
    fireEvent.change(input, { target: { value: "52998224725" } });
    expect((input as HTMLInputElement).value).toBe("529.982.247-25");
    fireEvent.click(screen.getByRole("button", { name: CPF_DIALOG_COPY.confirm }));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect((invoke.mock.calls[0][1] as { body: Record<string, unknown> }).body.cpfCnpj).toBe("52998224725");
    await waitFor(() => expect(window.location.href).toBe("https://asaas.test/c/1"));
  });

  it("documento inválido mostra o erro e não chama o servidor", async () => {
    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" />);
    await clickPlano();
    fireEvent.change(await screen.findByLabelText(CPF_DIALOG_COPY.label), { target: { value: "11111111111" } });
    fireEvent.click(screen.getByRole("button", { name: CPF_DIALOG_COPY.confirm }));
    expect(await screen.findByText(CPF_DIALOG_COPY.error)).toBeTruthy();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("documento salvo: pula o pedido; servidor pedindo de novo reabre com a mensagem dele", async () => {
    storedDoc = "52998224725";
    invoke.mockResolvedValue({ data: { ok: false, reason: "documento_invalido", message: "Mensagem do servidor" }, error: null });
    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" />);
    await clickPlano();
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect((invoke.mock.calls[0][1] as { body: Record<string, unknown> }).body.cpfCnpj).toBeUndefined();
    expect(await screen.findByText("Mensagem do servidor")).toBeTruthy();
  });

  it("cliente_indisponivel vira toast destrutivo com a mensagem do servidor", async () => {
    storedDoc = "52998224725";
    invoke.mockResolvedValue({ data: { ok: false, reason: "cliente_indisponivel", message: "Tenta de novo" }, error: null });
    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" />);
    await clickPlano();
    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    const arg = toastMock.mock.calls[0][0] as { description: string; variant: string };
    expect(arg.description).toBe("Tenta de novo");
    expect(arg.variant).toBe("destructive");
  });

  it("autoSelectPlan: pedido aparece e 'Voltar' encerra o fluxo automático", async () => {
    const settled = vi.fn();
    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" autoSelectPlan="influencia" onAutoSelectSettled={settled} />);
    expect(await screen.findByText(CPF_DIALOG_COPY.title)).toBeTruthy();
    expect(settled).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: CPF_DIALOG_COPY.back }));
    await waitFor(() => expect(settled).toHaveBeenCalledTimes(1));
    expect(invoke).not.toHaveBeenCalled();
  });
});

for (const [reason, label] of [
  ["documento_necessario", "CPF ou CNPJ"],
  ["documento_invalido", "CPF ou CNPJ"],
  ["endereco_necessario", "CEP"],
  ["endereco_invalido", "CEP"],
  ["celular_necessario", "Celular (com DDD)"],
]) {
  it(`P22-fix: ${reason} reopens only matching group with initial server error`, async () => {
    storedDoc = "52998224725";
    invoke.mockResolvedValue({ data: { ok: false, reason, message: "Mensagem do servidor" }, error: null });
    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" />);
    await clickPlano();
    expect(await screen.findByLabelText(label)).toBeInTheDocument();
    expect(screen.getByText("Mensagem do servidor")).toBeInTheDocument();
    for (const other of ["CPF ou CNPJ", "CEP", "Celular (com DDD)"].filter((s) => s !== label)) expect(screen.queryByLabelText(other)).toBeNull();
    expect(invoke).toHaveBeenCalledTimes(1);
  });
}
