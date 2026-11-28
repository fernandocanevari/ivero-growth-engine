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

// P60 (finding 54): frase da 1ª cobrança também no trial (concedido ou retomado).
const { firstChargeDescriptionDay } = await import("./index.ts");
const DUE = "2026-12-03";
const SENT = "Nada é cobrado hoje. A primeira cobrança é em 03/12/2026.";
const ANUAL_P = "Plano Presença com mensalidade promocional e compromisso de 12 meses.";
const desc = (base: string, a: boolean, t: boolean, r: boolean) =>
  resumeItemDescription(base, firstChargeDescriptionDay(a, t, r, DUE));

Deno.test("P60 trialConcedido → duas frases + base", () => {
  assertEquals(desc(ANUAL_P, false, true, false), `${SENT} ${ANUAL_P}`);
  assertEquals(desc(MENSAL, false, true, false), `${SENT} ${MENSAL}`);
});
Deno.test("P60 retomada de teste e retomada paga → duas frases", () => {
  assertEquals(desc(ANUAL_P, false, false, true), `${SENT} ${ANUAL_P}`);
});
Deno.test("P60 paga hoje → texto antigo exato", () => {
  assertEquals(desc(ANUAL_P, false, false, false), ANUAL_P);
});
Deno.test("P60 agência → texto antigo exato", () => {
  const base = "3 marcas com 10% de desconto por volume";
  assertEquals(desc(base, true, true, true), base);
  assertEquals(desc(base, true, false, false), base);
});
Deno.test("P60 3 planos × 2 ciclos ≤ 150 e mantém base", () => {
  for (const nome of ["Presença", "Influência", "Autoridade"]) {
    for (const base of [`Plano ${nome} com mensalidade promocional e compromisso de 12 meses.`, `Plano ${nome} com mensalidade sem compromisso.`]) {
      const d = desc(base, false, true, false);
      assertEquals(d.length <= 150, true);
      assertEquals(d, `${SENT} ${base}`);
    }
  }
});
