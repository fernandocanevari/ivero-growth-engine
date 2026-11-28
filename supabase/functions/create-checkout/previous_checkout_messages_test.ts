import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
Object.defineProperty(Deno, "serve", { configurable: true, value: () => {} });
const { CHECKOUT_ANTERIOR_EM_CONFERENCIA_MSG, CHECKOUT_ANTERIOR_NAO_ENCERRADO_MSG } = await import("./index.ts");

const ALL = [CHECKOUT_ANTERIOR_EM_CONFERENCIA_MSG, CHECKOUT_ANTERIOR_NAO_ENCERRADO_MSG];

Deno.test("P62: textos aprovados exatos", () => {
  assertEquals(CHECKOUT_ANTERIOR_EM_CONFERENCIA_MSG, "Estamos conferindo o último cadastro do seu cartão, o que costuma levar poucos minutos. Se daqui a pouco este aviso continuar aparecendo, fale com a gente que resolvemos.");
  assertEquals(CHECKOUT_ANTERIOR_NAO_ENCERRADO_MSG, "Não conseguimos encerrar o seu pedido anterior agora. Tente de novo em alguns minutos. Se continuar, fale com a gente.");
});
Deno.test("P62: sem 'pagamento' nem 'multa'", () => {
  for (const m of ALL) assert(!/pagamento|multa/i.test(m), m);
});
Deno.test("P62: no máximo 200 caracteres", () => {
  for (const m of ALL) assert(m.length <= 200, `${m.length}`);
});
