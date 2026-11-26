import { describe, it, expect, vi, afterEach } from "vitest";
import { isValidAddress, isValidPhone, normalizeAddress, maskCep, maskPhone, lookupCep } from "./billing-profile";
import * as server from "../../supabase/functions/_shared/billing-profile";
const address = { cep: "01310100", logradouro: "Avenida Paulista", numero: "10", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP" };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("billing profile mirrored rules", () => {
  it("phone is 10/11 digits with DDD not beginning with zero in both copies", () => {
    for (const [value, valid] of [["11987654321", true], ["(11) 3456-7890", true], ["01987654321", false], ["123456789", false], ["119876543210", false], [null, false]] as const) {
      expect(isValidPhone(value)).toBe(valid); expect(server.isValidPhone(value)).toBe(valid);
    }
  });
  it("CEP must have exactly 8 digits in both copies", () => {
    for (const cep of ["1234567", "123456789", ""]) {
      expect(isValidAddress({ ...address, cep })).toBe(false); expect(server.isValidAddress({ ...address, cep })).toBe(false);
    }
    expect(isValidAddress(address)).toBe(true); expect(server.isValidAddress(address)).toBe(true);
  });
  it("number is required and limited to 20 characters", () => {
    for (const numero of ["", " ", "1".repeat(21)]) {
      expect(isValidAddress({ ...address, numero })).toBe(false); expect(server.isValidAddress({ ...address, numero })).toBe(false);
    }
    expect(isValidAddress({ ...address, numero: "1".repeat(20) })).toBe(true);
  });
  it("street/neighborhood/city trim and have a 120-character limit", () => {
    for (const key of ["logradouro", "bairro", "cidade"]) {
      for (const value of [" ", "x".repeat(121)]) {
        expect(isValidAddress({ ...address, [key]: value })).toBe(false); expect(server.isValidAddress({ ...address, [key]: value })).toBe(false);
      }
    }
    expect(normalizeAddress({ ...address, logradouro: " Rua ", uf: " sp " })).toEqual(server.normalizeAddress({ ...address, logradouro: " Rua ", uf: " sp " }));
  });
  it("UF is exactly two letters", () => {
    for (const uf of ["S", "SPX", "S1", ""]) { expect(isValidAddress({ ...address, uf })).toBe(false); expect(server.isValidAddress({ ...address, uf })).toBe(false); }
    expect(isValidAddress({ ...address, uf: "sp" })).toBe(true);
  });
  it("CEP lookup sends only CEP and normalizes the returned address", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ logradouro: address.logradouro, bairro: address.bairro, localidade: address.cidade, uf: "SP" })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await lookupCep("01310-100")).toEqual({ cep: address.cep, logradouro: address.logradouro, bairro: address.bairro, cidade: address.cidade, uf: "SP" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://viacep.com.br/ws/01310100/json/");
  });
  it("CEP lookup timeout is five seconds", async () => {
    vi.useFakeTimers(); vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const pending = lookupCep(address.cep); const assertion = expect(pending).rejects.toThrow("cep_timeout");
    await vi.advanceTimersByTimeAsync(5000); await assertion;
  });
  it("CEP lookup rejects erro:true, HTTP failure, network failure, incomplete address", async () => {
    for (const data of [{ erro: true }, { logradouro: "", bairro: "", localidade: "São Paulo", uf: "SP" }]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(data))));
      await expect(lookupCep(address.cep)).rejects.toThrow();
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 }))); await expect(lookupCep(address.cep)).rejects.toThrow();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline"))); await expect(lookupCep(address.cep)).rejects.toThrow("offline");
  });
  it("invalid CEP is rejected without network", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); await expect(lookupCep("123")).rejects.toThrow("invalid_cep"); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("phone and CEP masks retain digits", () => {
    expect(maskCep("01310100")).toBe("01310-100"); expect(maskPhone("11987654321")).toBe("(11) 98765-4321"); expect(maskPhone("1134567890")).toBe("(11) 3456-7890");
  });
});
