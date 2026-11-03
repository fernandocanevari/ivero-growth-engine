import { describe, expect, it } from "vitest";
import { formatDateBR } from "./date-display";

describe(`formatDateBR (TZ=${process.env.TZ ?? "padrão"})`, () => {
  it("fim do dia em Brasília gravado em UTC mostra o dia de Brasília", () => {
    expect(formatDateBR("2026-12-11T02:59:59.999Z")).toBe("10/12/2026");
    expect(formatDateBR("2026-12-03T02:59:59.999Z")).toBe("02/12/2026");
  });

  it("timestamp no meio do dia", () => {
    expect(formatDateBR("2026-11-10T15:00:00.000Z")).toBe("10/11/2026");
  });

  it("data civil do Asaas não é deslocada por fuso", () => {
    expect(formatDateBR("2026-11-10")).toBe("10/11/2026");
  });

  it("vazio ou inválido usa o texto de reserva de sempre", () => {
    expect(formatDateBR(null)).toBe("—");
    expect(formatDateBR(undefined)).toBe("—");
    expect(formatDateBR("")).toBe("—");
    expect(formatDateBR("abc")).toBe("—");
    expect(formatDateBR("2026-02-30")).toBe("—");
  });
});
