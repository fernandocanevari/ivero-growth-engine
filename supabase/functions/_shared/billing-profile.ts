import { onlyDigits } from "./document.ts";

export type BillingAddress = { cep: string; logradouro: string; numero: string; bairro: string; cidade: string; uf: string };
export type BillingGroup = "documento" | "endereco" | "celular";
export type BillingInput = { cpfCnpj?: string; endereco?: BillingAddress; celular?: string };

export function isValidPhone(value: unknown): boolean {
  const digits = onlyDigits(value);
  return /^(?:[1-9][0-9])[0-9]{8,9}$/.test(digits);
}

export function normalizeAddress(value: unknown): BillingAddress {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const text = (key: string) => typeof v[key] === "string" ? v[key].trim() : "";
  return { cep: onlyDigits(v.cep), logradouro: text("logradouro"), numero: text("numero"), bairro: text("bairro"), cidade: text("cidade"), uf: text("uf").toUpperCase() };
}

export function isValidAddress(value: unknown): boolean {
  const v = normalizeAddress(value);
  return /^\d{8}$/.test(v.cep) && v.numero.length > 0 && v.numero.length <= 20 &&
    [v.logradouro, v.bairro, v.cidade].every((s) => s.length > 0 && s.length <= 120) && /^[A-Z]{2}$/.test(v.uf);
}

export const BILLING_MESSAGES = {
  endereco_necessario: "Para abrir o pagamento, precisamos do endereço de quem vai pagar.",
  endereco_invalido: "Esse endereço não parece completo. Confere os campos e tenta de novo.",
  celular_necessario: "Para abrir o pagamento, precisamos de um celular válido com DDD.",
} as const;