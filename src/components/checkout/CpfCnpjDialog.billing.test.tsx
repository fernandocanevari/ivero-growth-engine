import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
const own = { cpf_cnpj: "52998224725", celular: "11987654321", cep: "01310100", logradouro: "Avenida Paulista", numero_endereco: "10", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP" };
let profile: Record<string, unknown> = {};
const select = vi.fn(); const eq = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: "own-user" } } }) },
  from: () => ({ select: (fields: string) => { select(fields); return { eq: (...args: unknown[]) => { eq(...args); return { maybeSingle: async () => ({ data: profile }) }; } }; } }),
} }));
import { CpfCnpjDialog, CPF_DIALOG_COPY, loadOwnDocument, billingGroupForReason } from "./CpfCnpjDialog";
const confirm = vi.fn();
const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: CPF_DIALOG_COPY.confirm }));
beforeEach(() => { profile = { ...own }; select.mockClear(); eq.mockClear(); confirm.mockClear(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const viaCep = { logradouro: own.logradouro, bairro: own.bairro, localidade: own.cidade, uf: own.uf };
describe("billing dialog", () => {
  it("loader uses one own-row select; complete profile has no missing groups", async () => {
    expect(await loadOwnDocument()).toEqual([]); expect(select).toHaveBeenCalledTimes(1); expect(eq).toHaveBeenCalledWith("user_id", "own-user");
  });
  it("only missing document is shown; valid profile phone and address hidden", async () => {
    profile.cpf_cnpj = null;
    render(<CpfCnpjDialog open groups={await loadOwnDocument()} onConfirm={confirm} onCancel={() => {}} />);
    expect(screen.getByLabelText("CPF ou CNPJ")).toBeInTheDocument(); expect(screen.queryByLabelText("CEP")).toBeNull(); expect(screen.queryByLabelText("Celular (com DDD)")).toBeNull();
    fill("CPF ou CNPJ", own.cpf_cnpj); submit(); expect(confirm).toHaveBeenCalledWith({ cpfCnpj: own.cpf_cnpj });
  });
  it("invalid profile phone shows only phone and sends digits only", async () => {
    profile.celular = "01987654321";
    render(<CpfCnpjDialog open groups={await loadOwnDocument()} onConfirm={confirm} onCancel={() => {}} />);
    expect(screen.queryByLabelText("CEP")).toBeNull(); expect(screen.queryByLabelText("CPF ou CNPJ")).toBeNull();
    fill("Celular (com DDD)", "11987654321"); submit(); expect(confirm).toHaveBeenCalledWith({ celular: "11987654321" });
  });
  it("CEP lookup fills preview and sends only the collected address", async () => {
    profile.cep = null; vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(viaCep))));
    render(<CpfCnpjDialog open groups={await loadOwnDocument()} onConfirm={confirm} onCancel={() => {}} />);
    expect(screen.queryByLabelText("Celular (com DDD)")).toBeNull();
    fill("CEP", "01310100"); fill("Número", " 20 ");
    expect(await screen.findByText("Avenida Paulista, Bela Vista, São Paulo/SP")).toBeInTheDocument();
    expect(screen.queryByLabelText("Rua")).toBeNull(); submit();
    expect(confirm).toHaveBeenCalledWith({ endereco: { cep: "01310100", logradouro: own.logradouro, numero: "20", bairro: own.bairro, cidade: own.cidade, uf: own.uf } });
  });
  it("lookup erro:true reveals manual address, still blocks missing number", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ erro: true }))));
    render(<CpfCnpjDialog open groups={["endereco"]} onConfirm={confirm} onCancel={() => {}} />);
    fill("CEP", "00000000"); expect(await screen.findByLabelText("Rua")).toBeInTheDocument();
    expect(screen.getByText(CPF_DIALOG_COPY.lookupError)).toBeInTheDocument();
    fill("Rua", " Rua A "); fill("Bairro", " Bairro A "); fill("Cidade", " São Paulo "); fill("UF", "sp"); submit();
    expect(confirm).not.toHaveBeenCalled(); expect(screen.getByText(CPF_DIALOG_COPY.addressError)).toBeInTheDocument();
    fill("Número", "10"); submit(); expect(confirm).toHaveBeenCalledWith({ endereco: { cep: "00000000", logradouro: "Rua A", bairro: "Bairro A", cidade: "São Paulo", uf: "SP", numero: "10" } });
  });
  it("network failure reveals manual fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<CpfCnpjDialog open groups={["endereco"]} onConfirm={confirm} onCancel={() => {}} />);
    fill("CEP", "01310100"); expect(await screen.findByLabelText("Rua")).toBeInTheDocument();
  });
  it("five-second lookup timeout reveals manual fields", async () => {
    vi.useFakeTimers(); vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<CpfCnpjDialog open groups={["endereco"]} onConfirm={confirm} onCancel={() => {}} />);
    fill("CEP", "01310100"); await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByLabelText("Rua")).toBeInTheDocument(); expect(screen.getByText(CPF_DIALOG_COPY.lookupError)).toBeInTheDocument();
  });
  it("incomplete CEP blocked without lookup and invalid phone blocked", () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<CpfCnpjDialog open groups={["endereco"]} onConfirm={confirm} onCancel={() => {}} />);
    fill("CEP", "1234567"); fill("Número", "10"); submit(); expect(confirm).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
    rerender(<CpfCnpjDialog open groups={["celular"]} onConfirm={confirm} onCancel={() => {}} />);
    fill("Celular (com DDD)", "01987654321"); submit(); expect(confirm).not.toHaveBeenCalled(); expect(screen.getByText(CPF_DIALOG_COPY.phoneError)).toBeInTheDocument();
  });
  it("all missing groups submit exactly cpfCnpj/endereco/celular", async () => {
    profile = {}; vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(viaCep))));
    render(<CpfCnpjDialog open groups={await loadOwnDocument()} onConfirm={confirm} onCancel={() => {}} />);
    fill("CPF ou CNPJ", own.cpf_cnpj); fill("CEP", own.cep); fill("Número", "10"); fill("Celular (com DDD)", own.celular);
    await screen.findByText("Avenida Paulista, Bela Vista, São Paulo/SP"); submit();
    expect(confirm).toHaveBeenCalledTimes(1); expect(Object.keys(confirm.mock.calls[0][0]).sort()).toEqual(["celular", "cpfCnpj", "endereco"]);
  });
  it("changing CEP cannot reuse the previous address", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(viaCep))).mockRejectedValueOnce(new Error("offline")); vi.stubGlobal("fetch", fetchMock);
    render(<CpfCnpjDialog open groups={["endereco"]} onConfirm={confirm} onCancel={() => {}} />);
    fill("CEP", own.cep); fill("Número", "10"); await screen.findByText("Avenida Paulista, Bela Vista, São Paulo/SP");
    fill("CEP", "1234567"); submit(); expect(confirm).not.toHaveBeenCalled(); expect(screen.queryByText("Avenida Paulista, Bela Vista, São Paulo/SP")).toBeNull();
  });
  it("server reason maps to exactly the requested group", () => {
    for (const [reason, group] of [["documento_necessario", "documento"], ["documento_invalido", "documento"], ["endereco_necessario", "endereco"], ["endereco_invalido", "endereco"], ["celular_necessario", "celular"]]) expect(billingGroupForReason({ reason })).toBe(group);
    expect(billingGroupForReason({ reason: "cliente_indisponivel" })).toBeNull();
  });
});
