import { onlyDigits } from "./document-validation";

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

export function maskCep(value: unknown): string {
  return onlyDigits(value).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

export function maskPhone(value: unknown): string {
  const d = onlyDigits(value).slice(0, 11);
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(d.length > 10 ? /(\d{5})(\d{1,4})$/ : /(\d{4})(\d{1,4})$/, "$1-$2");
}

/** Public CEP lookup only: no account, document, or phone is sent. */
export async function lookupCep(value: string, signal?: AbortSignal): Promise<Omit<BillingAddress, "numero">> {
  const cep = onlyDigits(value);
  if (!/^\d{8}$/.test(cep)) throw new Error("invalid_cep");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal }).then(async (response) => {
        if (!response.ok) throw new Error("cep_unavailable");
        const json = await response.json();
        if (json.erro) throw new Error("cep_not_found");
        const address = normalizeAddress({ cep, logradouro: json.logradouro, bairro: json.bairro, cidade: json.localidade, uf: json.uf, numero: "1" });
        if (!isValidAddress(address)) throw new Error("cep_incomplete");
        const { numero: _numero, ...rest } = address;
        return rest;
      }),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("cep_timeout")); }, 5000);
      }),
    ]);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}