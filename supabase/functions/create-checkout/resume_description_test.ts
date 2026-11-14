import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
Object.defineProperty(Deno, "serve", { configurable: true, value: () => {} });
const { resumeItemDescription } = await import("./index.ts");

Deno.test("sem retomada paga → descrição intacta", () => {
  assertEquals(resumeItemDescription("Plano x — mensalidade sem compromisso", null), "Plano x — mensalidade sem compromisso");
});
Deno.test("acrescenta a frase com espaço", () => {
  assertEquals(resumeItemDescription("Base", "2026-12-05"), "Base Nada é cobrado hoje. A primeira cobrança é em 05/12/2026.");
});
Deno.test("passando de 150 caracteres → só a frase nova", () => {
  assertEquals(resumeItemDescription("x".repeat(120), "2026-12-05"), "Nada é cobrado hoje. A primeira cobrança é em 05/12/2026.");
});
