import { describe, it, expect } from "vitest";
import { isValidCpfCnpj, maskCpfCnpj, onlyDigits } from "./document-validation";

describe("CPF/CNPJ (mesmas regras do servidor)", () => {
  it("aceita CPF e CNPJ válidos, com ou sem máscara", () => {
    expect(isValidCpfCnpj("52998224725")).toBe(true);
    expect(isValidCpfCnpj("529.982.247-25")).toBe(true);
    expect(isValidCpfCnpj("11222333000181")).toBe(true);
    expect(isValidCpfCnpj("11.222.333/0001-81")).toBe(true);
  });
  it("recusa dígito verificador errado", () => {
    expect(isValidCpfCnpj("52998224724")).toBe(false);
    expect(isValidCpfCnpj("11222333000180")).toBe(false);
  });
  it("recusa dígitos todos iguais e tamanhos errados", () => {
    for (const v of ["00000000000", "11111111111", "99999999999999", "123", "", "1234567890123"]) {
      expect(isValidCpfCnpj(v)).toBe(false);
    }
  });
  it("máscara progressiva de CPF e CNPJ", () => {
    expect(maskCpfCnpj("52998224725")).toBe("529.982.247-25");
    expect(maskCpfCnpj("5299822")).toBe("529.982.2");
    expect(maskCpfCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(maskCpfCnpj("11.222.333/0001-8199")).toBe("11.222.333/0001-81");
    expect(onlyDigits("529.982.247-25")).toBe("52998224725");
  });
});
