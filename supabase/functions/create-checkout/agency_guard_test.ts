// Confere no código publicado da função que a checagem do tipo de conta vale
// para toda chamada (fora do bloco body.agency) e usa o código combinado.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));

Deno.test("agência sem body.agency é recusada com agencia_usa_faturamento_consolidado (409)", () => {
  const guard = src.indexOf("if (isAgencyAccount && !body?.agency)");
  const block = src.indexOf("if (body?.agency) {");
  assert(guard > 0 && block > guard, "checagem fica antes e fora do bloco body.agency");
  const slice = src.slice(guard, block);
  assert(slice.includes("agencia_usa_faturamento_consolidado"));
  assert(slice.includes("status: 409"));
});

Deno.test("fluxo consolidado (com body.agency) continua aceito para agência", () => {
  const block = src.slice(src.indexOf("if (body?.agency) {"));
  assert(block.includes("if (!isAgencyAccount)"), "só conta não-agência é recusada no modo agência");
  assert(block.includes("quoteAgency(chosen, ciclo)"));
});
