import { describe, it, expect } from "vitest";
import { formatPhoneBR } from "./format-phone";

describe("formatPhoneBR", () => {
  it("retorna vazio para input vazio", () => {
    expect(formatPhoneBR("")).toBe("");
    expect(formatPhoneBR("abc")).toBe("");
  });

  it("formata progressivamente conforme digitação", () => {
    expect(formatPhoneBR("11")).toBe("(11");
    expect(formatPhoneBR("119")).toBe("(11) 9");
    expect(formatPhoneBR("1199999")).toBe("(11) 9999-9");
    expect(formatPhoneBR("11999998888")).toBe("(11) 99999-8888");
  });

  it("ignora caracteres não numéricos", () => {
    expect(formatPhoneBR("(11) 99999-8888")).toBe("(11) 99999-8888");
    expect(formatPhoneBR("+55 11 99999-8888")).toBe("(55) 11999-9988");
  });

  it("limita a 11 dígitos", () => {
    expect(formatPhoneBR("11999998888999")).toBe("(11) 99999-8888");
  });
});
