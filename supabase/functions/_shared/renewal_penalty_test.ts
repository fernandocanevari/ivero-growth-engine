// P57 — regra a jusante da renovação do compromisso anual (linha após claim_subscription_payment renovar).
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calcularMultaCancelamento, snapshotDesconto } from "./penalty.ts";

const renovada = (ciclos_pagos: number) => ({
  plano: "presenca", ciclo_contratado: "anual", ciclos_pagos, compromisso_meses: 12,
  desconto_acumulado: 0, ciclos_no_upgrade: 0,
});

Deno.test("renovada, 1 ciclo pago → 100", () => assertEquals(calcularMultaCancelamento(renovada(1)).valor, 100));
Deno.test("renovada, 2 ciclos pagos → 200", () => assertEquals(calcularMultaCancelamento(renovada(2)).valor, 200));
Deno.test("renovada, 11 ciclos pagos → 1100", () => assertEquals(calcularMultaCancelamento(renovada(11)).valor, 1100));
Deno.test("renovada, 12 ciclos pagos → 0", () => assertEquals(calcularMultaCancelamento(renovada(12)).valor, 0));
Deno.test("snapshotDesconto na renovada com 2 ciclos guarda 100 por ciclo", () =>
  assertEquals(snapshotDesconto(renovada(2)), { desconto_acumulado: 200, ciclos_no_upgrade: 2 }));
