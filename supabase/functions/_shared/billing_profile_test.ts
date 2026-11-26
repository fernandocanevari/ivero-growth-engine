import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isValidPhone, isValidAddress, normalizeAddress } from "./billing-profile.ts";
const address = { cep: "01310100", logradouro: "Avenida Paulista", numero: "10", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP" };
Deno.test("billing phone: 10/11 digits; DDD cannot start with 0", () => {
  for (const [value, valid] of [["11987654321", true], ["(11) 3456-7890", true], ["01987654321", false], ["123456789", false], ["119876543210", false], [null, false]] as const) assertEquals(isValidPhone(value), valid);
});
Deno.test("billing address: CEP has exactly 8 digits", () => {
  assertEquals(isValidAddress(address), true);
  for (const cep of ["1234567", "123456789", ""]) assertEquals(isValidAddress({ ...address, cep }), false);
});
Deno.test("billing address: number trimmed, required, max 20", () => {
  for (const numero of ["", " ", "x".repeat(21)]) assertEquals(isValidAddress({ ...address, numero }), false);
  assertEquals(isValidAddress({ ...address, numero: "x".repeat(20) }), true);
});
for (const field of ["logradouro", "bairro", "cidade"]) Deno.test(`billing address: ${field} trimmed, required, max 120`, () => {
  for (const value of [" ", "x".repeat(121)]) assertEquals(isValidAddress({ ...address, [field]: value }), false);
  assertEquals(isValidAddress({ ...address, [field]: "x".repeat(120) }), true);
});
Deno.test("billing address: UF exactly two letters", () => {
  for (const uf of ["S", "SPX", "S1", ""]) assertEquals(isValidAddress({ ...address, uf }), false);
  assertEquals(isValidAddress({ ...address, uf: "sp" }), true);
});
Deno.test("billing address normalization: CEP digits, trimmed fields, uppercase UF", () => {
  assertEquals(normalizeAddress({ ...address, cep: "01310-100", numero: " 10 ", uf: " sp " }), address);
});
