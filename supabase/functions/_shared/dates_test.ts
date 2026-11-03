import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { accessEndFromDueDate } from "./dates.ts";

const NOW = new Date("2026-11-02T15:00:00.000Z");
const EARLY = new Date("2025-06-01T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

Deno.test("dueDate 2026-11-09 → 2026-12-09 23:59:59.999 Brasília (2026-12-10T02:59:59.999Z)", () => {
  assertEquals(accessEndFromDueDate("2026-11-09", NOW), { value: "2026-12-10T02:59:59.999Z", usedFallback: false });
});

Deno.test("dueDate 2026-11-02 (pago no dia) → 2026-12-03T02:59:59.999Z", () => {
  assertEquals(accessEndFromDueDate("2026-11-02", NOW), { value: "2026-12-03T02:59:59.999Z", usedFallback: false });
});

Deno.test("31/01 em ano comum → 28/02 fim do dia em Brasília", () => {
  assertEquals(accessEndFromDueDate("2026-01-31", EARLY), { value: "2026-03-01T02:59:59.999Z", usedFallback: false });
});

Deno.test("31/01 em ano bissexto → 29/02 fim do dia em Brasília", () => {
  assertEquals(accessEndFromDueDate("2028-01-31", EARLY), { value: "2028-03-01T02:59:59.999Z", usedFallback: false });
});

Deno.test("dezembro vira janeiro do ano seguinte: 2026-12-15 → 2027-01-15", () => {
  assertEquals(accessEndFromDueDate("2026-12-15", NOW), { value: "2027-01-16T02:59:59.999Z", usedFallback: false });
});

for (const bad of [null, undefined, "", "abc", "2026-02-30", "2026-13-01", "2026-11-9", "2026-11-09T00:00:00Z"]) {
  Deno.test(`dueDate inválido (${JSON.stringify(bad)}) → agora + 30 dias, usedFallback true`, () => {
    assertEquals(accessEndFromDueDate(bad as string | null | undefined, NOW), { value: new Date(NOW.getTime() + 30 * DAY).toISOString(), usedFallback: true });
  });
}

Deno.test("resultado no passado → agora + 30 dias, usedFallback true", () => {
  assertEquals(accessEndFromDueDate("2026-09-01", NOW), { value: new Date(NOW.getTime() + 30 * DAY).toISOString(), usedFallback: true });
});

Deno.test("resultado exatamente igual a agora não conta como futuro → fallback", () => {
  const at = new Date("2026-12-10T02:59:59.999Z");
  assertEquals(accessEndFromDueDate("2026-11-09", at).usedFallback, true);
});
