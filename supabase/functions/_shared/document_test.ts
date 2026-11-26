import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isValidCpfCnpj, onlyDigits } from "./document.ts";

Deno.test("CPF válido com e sem máscara", () => {
  assertEquals(isValidCpfCnpj("52998224725"), true);
  assertEquals(isValidCpfCnpj("529.982.247-25"), true);
});
Deno.test("CPF com dígito verificador errado", () => {
  assertEquals(isValidCpfCnpj("52998224724"), false);
  assertEquals(isValidCpfCnpj("52998224715"), false);
});
Deno.test("CNPJ válido com e sem máscara", () => {
  assertEquals(isValidCpfCnpj("11222333000181"), true);
  assertEquals(isValidCpfCnpj("11.222.333/0001-81"), true);
});
Deno.test("CNPJ com dígito verificador errado", () => {
  assertEquals(isValidCpfCnpj("11222333000180"), false);
  assertEquals(isValidCpfCnpj("11222333000191"), false);
});
Deno.test("dígitos todos iguais e tamanhos errados são recusados", () => {
  for (const v of ["00000000000", "11111111111", "99999999999999", "123", "", null, "1234567890123"]) assertEquals(isValidCpfCnpj(v), false, String(v));
});
Deno.test("onlyDigits remove máscara", () => assertEquals(onlyDigits("11.222.333/0001-81"), "11222333000181"));
