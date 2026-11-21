import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
Object.defineProperty(Deno, "serve", { configurable: true, value: () => {} });
const { resumeItemDescription } = await import("./index.ts");

const MENSAL = "Plano Presença com mensalidade sem compromisso.";
const ANUAL = "Plano Autoridade com mensalidade promocional e compromisso de 12 meses.";

Deno.test("sem retomada paga → descrição intacta", () => {
  assertEquals(resumeItemDescription(MENSAL, null), MENSAL);
  assertEquals(resumeItemDescription(ANUAL, null), ANUAL);
});
Deno.test("retomada paga mensal: frases antes do texto base", () => {
  assertEquals(resumeItemDescription(MENSAL, "2026-11-24"),
    "Nada é cobrado hoje. A primeira cobrança é em 24/11/2026. Plano Presença com mensalidade sem compromisso.");
});
Deno.test("retomada paga anual: frases antes do texto base", () => {
  assertEquals(resumeItemDescription(ANUAL, "2026-11-24"),
    "Nada é cobrado hoje. A primeira cobrança é em 24/11/2026. Plano Autoridade com mensalidade promocional e compromisso de 12 meses.");
});
Deno.test("passando de 150 caracteres → só as duas primeiras frases", () => {
  assertEquals(resumeItemDescription("x".repeat(120), "2026-12-05"), "Nada é cobrado hoje. A primeira cobrança é em 05/12/2026.");
});
