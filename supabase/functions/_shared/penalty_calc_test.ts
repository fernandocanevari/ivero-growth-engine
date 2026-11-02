// P26-fix2 — cálculo único da multa e registro do desconto na troca de plano.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calcularMultaCancelamento, snapshotDesconto } from "./penalty.ts";

const anual = (extra: Record<string, unknown> = {}) => ({ plano: "presenca", ciclo_contratado: "anual", ciclos_pagos: 1, compromisso_meses: 12, desconto_acumulado: null, ciclos_no_upgrade: null, ...extra });

Deno.test("a) Presença anual, 1 ciclo → 100", () => {
  assertEquals(calcularMultaCancelamento(anual()).valor, 100);
  assertEquals(calcularMultaCancelamento(anual()).ciclos, 1);
});

Deno.test("b) cliente71: 2 ciclos em Presença, upgrade para Influência, nenhum ciclo depois → 200", () => {
  const snap = snapshotDesconto(anual({ ciclos_pagos: 2 }));
  assertEquals(snap, { desconto_acumulado: 200, ciclos_no_upgrade: 2 });
  const r = calcularMultaCancelamento(anual({ plano: "influencia", ciclos_pagos: 2, ...snap }));
  assertEquals([r.valor, r.ciclos, r.emCompromisso], [200, 2, true]);
});

Deno.test("c) depois +3 ciclos em Influência → 2×100 + 3×180 = 740", () => {
  const r = calcularMultaCancelamento(anual({ plano: "influencia", ciclos_pagos: 5, desconto_acumulado: 200, ciclos_no_upgrade: 2 }));
  assertEquals([r.valor, r.ciclos], [740, 5]);
});

Deno.test("d) linha antiga sem snapshot, Influência, 2 ciclos → 360", () => {
  assertEquals(calcularMultaCancelamento(anual({ plano: "influencia", ciclos_pagos: 2 })).valor, 360);
});

Deno.test("e) mensal → 0", () => {
  const r = calcularMultaCancelamento(anual({ ciclo_contratado: "mensal", ciclos_pagos: 3 }));
  assertEquals([r.valor, r.emCompromisso], [0, false]);
});

Deno.test("f) ciclos pagos em poucos dias contam todos (sem trava de calendário)", () => {
  // A função não recebe datas: 3 ciclos = 3 × 100, independentemente de compromisso_inicio.
  assertEquals(calcularMultaCancelamento(anual({ ciclos_pagos: 3, compromisso_inicio: new Date().toISOString() })).valor, 300);
});

Deno.test("g) teto do compromisso: compromisso cumprido → 0; snapshot nunca conta além do compromisso", () => {
  assertEquals(calcularMultaCancelamento(anual({ ciclos_pagos: 12 })).valor, 0);
  assertEquals(snapshotDesconto(anual({ ciclos_pagos: 14 })), { desconto_acumulado: 1200, ciclos_no_upgrade: 14 });
  // compromisso menor que o registrado no snapshot: só a parte dentro do compromisso.
  const r = calcularMultaCancelamento(anual({ plano: "influencia", ciclos_pagos: 4, compromisso_meses: 5, desconto_acumulado: 600, ciclos_no_upgrade: 6 }));
  // cobertos = 5, antes = 4 → 600 × 4/5 = 480
  assertEquals([r.valor, r.ciclos], [480, 4]);
});

Deno.test("h) abaixo de R$ 5 → descartada", () => {
  const r = calcularMultaCancelamento(anual({ plano: "influencia", ciclos_pagos: 3, desconto_acumulado: 4, ciclos_no_upgrade: 3 }));
  assertEquals([r.valor, r.abaixoDoMinimo], [0, true]);
});

Deno.test("snapshot: mensal → nada; usa o plano ANTIGO; soma só ciclos novos", () => {
  assertEquals(snapshotDesconto(anual({ ciclo_contratado: "mensal", ciclos_pagos: 2 })), {});
  assertEquals(snapshotDesconto(anual({ plano: "influencia", ciclos_pagos: 5, desconto_acumulado: 200, ciclos_no_upgrade: 2 })), { desconto_acumulado: 740, ciclos_no_upgrade: 5 });
  // Mesma linha de novo (sem ciclo novo): não soma.
  assertEquals(snapshotDesconto(anual({ plano: "influencia", ciclos_pagos: 5, desconto_acumulado: 740, ciclos_no_upgrade: 5 })), { desconto_acumulado: 740, ciclos_no_upgrade: 5 });
});
