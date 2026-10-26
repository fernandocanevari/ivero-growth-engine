/**
 * Roteamento por intenção no UpgradeModal.
 *
 * Cenários cobertos:
 *  1) trial + intent="contratar"     → create-checkout (pagamento real)
 *  2) trial + intent="trocar_plano"  → manage-subscription/change_plan (local)
 *  3) pagante + trocar_plano         → change_plan com pró-rata preservado
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const invoke = vi.fn();
const getUser = vi.fn();
const toastMock = vi.fn();
let statusMock: Record<string, unknown>;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => getUser() },
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));

vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => statusMock,
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...a: unknown[]) => toastMock(...a),
}));

vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/hooks/useAccountType", () => ({
  useAccountType: () => ({ accountType: "individual", agencyName: null, isLoading: false, isAgency: false }),
}));

import { UpgradeModal } from "./UpgradeModal";

const TRIAL = {
  plano: "presenca",
  isLoading: false,
  isAdmin: false,
  effectiveStatus: "trial",
  hasAsaasSubscription: false,
  cicloContratado: "mensal",
};

const PAGANTE = {
  plano: "presenca",
  isLoading: false,
  isAdmin: false,
  effectiveStatus: "ativo",
  hasAsaasSubscription: true,
  cicloContratado: "mensal",
};

beforeEach(() => {
  invoke.mockReset();
  getUser.mockReset();
  toastMock.mockReset();
  getUser.mockResolvedValue({
    data: { user: { id: "u1", email: "c@x.com", user_metadata: {} } },
  });
  // window.location.href não é atribuível em jsdom sem stub.
  Object.defineProperty(window, "location", {
    writable: true,
    value: { href: "" } as Location,
  });
});

async function clickPlano(nome: RegExp) {
  const btn = await screen.findByRole("button", { name: nome });
  fireEvent.click(btn);
}

describe("UpgradeModal — roteamento por intenção", () => {
  it("trial + contratar vai pro checkout real", async () => {
    statusMock = TRIAL;
    invoke.mockResolvedValue({
      data: { checkoutUrl: "https://asaas.test/checkout/1" },
      error: null,
    });

    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" />);
    await clickPlano(/Ampliar influência/i);

    await waitFor(() => expect(invoke).toHaveBeenCalled());
    const [fn, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fn).toBe("create-checkout");
    expect(opts.body.intent).toBe("contratar");
    expect(invoke.mock.calls.some(([n]) => n === "manage-subscription")).toBe(false);
    await waitFor(() =>
      expect(window.location.href).toBe("https://asaas.test/checkout/1"),
    );
  });

  it("trial + trocar_plano continua troca local", async () => {
    statusMock = TRIAL;
    invoke.mockResolvedValue({ data: { ok: true, mode: "local" }, error: null });

    render(<UpgradeModal open onOpenChange={() => {}} />);
    await clickPlano(/Ampliar influência/i);

    await waitFor(() => expect(invoke).toHaveBeenCalled());
    const [fn, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fn).toBe("manage-subscription");
    expect(opts.body.action).toBe("change_plan");
    expect(invoke.mock.calls.some(([n]) => n === "create-checkout")).toBe(false);
  });

  it("pagante fazendo upgrade mantém o pró-rata", async () => {
    statusMock = PAGANTE;
    invoke.mockResolvedValue({
      data: { ok: true, mode: "asaas", proRata: { value: 123.45, days: 12 } },
      error: null,
    });

    render(<UpgradeModal open onOpenChange={() => {}} />);
    await clickPlano(/Ampliar influência/i);

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    const arg = toastMock.mock.calls[0][0] as { description: string };
    expect(arg.description).toContain("123,45");
    expect(arg.description).toContain("12 dia");
  });

  it("pagante ativo + intent=contratar chama change_plan e NÃO chama create-checkout", async () => {
    statusMock = { ...PAGANTE, plano: "influencia" };
    invoke.mockResolvedValue({
      data: { ok: true, mode: "asaas", proRata: { value: 580, days: 29, invoiceUrl: "https://asaas.test/i/1" } },
      error: null,
    });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" />);
    await clickPlano(/autoridade/i);
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    expect(invoke.mock.calls[0][0]).toBe("manage-subscription");
    expect((invoke.mock.calls[0][1] as { body: Record<string, unknown> }).body.action).toBe("change_plan");
    expect(invoke.mock.calls.some(([n]) => n === "create-checkout")).toBe(false);
    await waitFor(() => expect(open).toHaveBeenCalledWith("https://asaas.test/i/1", "_blank", "noopener"));
    open.mockRestore();
  });

  it("409 assinatura_ativa_use_troca_de_plano refaz o pedido por change_plan, sem toast genérico", async () => {
    // Estado local ainda sem vínculo (ex.: cache antigo), servidor sabe que é pagante.
    statusMock = { ...TRIAL, effectiveStatus: "trial_expirado" };
    invoke.mockImplementation((fn: string) =>
      fn === "create-checkout"
        ? Promise.resolve({
            data: null,
            error: {
              message: "non-2xx",
              context: new Response(JSON.stringify({ error: "assinatura_ativa_use_troca_de_plano", message: "x" }), { status: 409 }),
            },
          })
        : Promise.resolve({ data: { ok: true, mode: "asaas" }, error: null }),
    );
    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" />);
    await clickPlano(/Ampliar influência/i);
    await waitFor(() => expect(invoke.mock.calls.some(([n]) => n === "manage-subscription")).toBe(true));
    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect((toastMock.mock.calls[0][0] as { variant?: string }).variant).not.toBe("destructive");
  });

  it("P25b pending_payment: aviso exato e abre a fatura da diferença", async () => {
    statusMock = PAGANTE;
    invoke.mockResolvedValue({
      data: {
        ok: true, mode: "pending_payment", plano: "presenca", planoPendente: "influencia", ciclo: "mensal",
        diferenca: 266.67, dueDate: "2026-10-29", invoiceUrl: "https://asaas.test/i/dif",
      },
      error: null,
    });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<UpgradeModal open onOpenChange={() => {}} />);
    await clickPlano(/Ampliar influência/i);
    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect((toastMock.mock.calls[0][0] as { description: string }).description).toBe(
      "Pedido registrado. O plano Influência será liberado assim que o pagamento da diferença de R$ 266,67 for confirmado. Você continua no seu plano atual.",
    );
    expect(open).toHaveBeenCalledWith("https://asaas.test/i/dif", "_blank", "noopener");
    open.mockRestore();
  });

  it("P25b pagamento_em_atraso mostra a mensagem do servidor", async () => {
    statusMock = { ...PAGANTE, effectiveStatus: "inadimplente" };
    const message = "Sua mensalidade está em atraso. Pague a fatura vencida para poder mudar de plano.";
    invoke.mockResolvedValue({ data: { ok: false, reason: "pagamento_em_atraso", message }, error: null });
    render(<UpgradeModal open onOpenChange={() => {}} />);
    await clickPlano(/Ampliar influência/i);
    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    const arg = toastMock.mock.calls[0][0] as { title: string; description: string };
    expect(arg.title).toBe("Mensalidade em atraso");
    expect(arg.description).toBe(message);
  });

  it("P25b pedido_em_andamento mostra aviso próprio, sem abrir checkout", async () => {
    statusMock = PAGANTE;
    invoke.mockResolvedValue({ data: { ok: false, reason: "pedido_em_andamento" }, error: null });
    render(<UpgradeModal open onOpenChange={() => {}} />);
    await clickPlano(/Ampliar influência/i);
    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    const arg = toastMock.mock.calls[0][0] as { title: string; description: string; variant?: string };
    expect(arg.title).toBe("Pedido em andamento");
    expect(arg.description).toContain("Já existe um pedido de mudança de plano");
    expect(invoke.mock.calls.some(([n]) => n === "create-checkout")).toBe(false);
  });
  for (const [reason, message] of [
    ["nao_foi_possivel_calcular", "Não conseguimos calcular a diferença agora. Tente de novo em alguns instantes."],
    ["cobranca_indisponivel", "Não foi possível gerar a cobrança da diferença agora. Nada foi alterado. Tente de novo em instantes."],
    ["pedido_em_andamento", "Já existe um pedido de mudança de plano sendo processado. Aguarde alguns instantes e tente de novo."],
    ["pagamento_em_atraso", "Sua mensalidade está em atraso. Pague a fatura vencida para poder mudar de plano."],
  ] as const) {
    it(`P25b-fix ${reason}: mostra a mensagem da resposta, nunca o texto técnico`, async () => {
      statusMock = PAGANTE;
      invoke.mockResolvedValue({ data: { ok: false, reason, message }, error: null });
      render(<UpgradeModal open onOpenChange={() => {}} />);
      await clickPlano(/Ampliar influência/i);
      await waitFor(() => expect(toastMock).toHaveBeenCalled());
      const arg = toastMock.mock.calls[0][0] as { description: string };
      expect(arg.description).toBe(message);
      expect(JSON.stringify(toastMock.mock.calls)).not.toContain("non-2xx");
      expect(invoke.mock.calls.some(([n]) => n === "create-checkout")).toBe(false);
    });
  }
});
