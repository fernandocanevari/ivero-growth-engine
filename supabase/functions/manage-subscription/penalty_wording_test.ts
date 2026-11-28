import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PENALTY_IN_ANALYSIS_MESSAGE, PENALTY_IN_PROGRESS_MESSAGE } from "./penalty.ts";

Deno.test("P65: textos exatos das mensagens de pay_penalty, sem 'multa'", () => {
  assertEquals(PENALTY_IN_PROGRESS_MESSAGE, "Já estamos abrindo a cobrança da diferença. Tente de novo em instantes.");
  assertEquals(
    PENALTY_IN_ANALYSIS_MESSAGE,
    "Recebemos o pagamento da diferença e ele está em análise. Assim que for confirmado, a pendência sai daqui.",
  );
  assertEquals(/multa/i.test(PENALTY_IN_PROGRESS_MESSAGE), false);
  assertEquals(/multa/i.test(PENALTY_IN_ANALYSIS_MESSAGE), false);
});
