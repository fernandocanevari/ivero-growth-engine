import { assertEquals } from "jsr:@std/assert@1";
import { planDisplayName } from "./plan-names.ts";

Deno.test("planDisplayName: códigos conhecidos", () => {
  assertEquals(planDisplayName("presenca"), "Presença");
  assertEquals(planDisplayName("influencia"), "Influência");
  assertEquals(planDisplayName("autoridade"), "Autoridade");
});
Deno.test("planDisplayName: null/undefined/vazio", () => {
  assertEquals(planDisplayName(null), "—");
  assertEquals(planDisplayName(undefined), "—");
  assertEquals(planDisplayName(""), "—");
});
Deno.test("planDisplayName: código desconhecido", () => {
  assertEquals(planDisplayName("dominio"), "Dominio");
});
