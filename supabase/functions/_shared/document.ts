// CPF/CNPJ: só dígitos. Regras espelhadas em src/lib/document-validation.ts.

export const onlyDigits = (v: unknown): string => String(v ?? "").replace(/\D/g, "");

const allSame = (d: string) => /^(\d)\1+$/.test(d);

function cpfValid(d: string): boolean {
  if (d.length !== 11 || allSame(d)) return false;
  const dv = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(d[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

function cnpjValid(d: string): boolean {
  if (d.length !== 14 || allSame(d)) return false;
  const dv = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(d[i]) * w[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

/** true para CPF (11) ou CNPJ (14) com os dois dígitos verificadores corretos. */
export function isValidCpfCnpj(value: unknown): boolean {
  const d = onlyDigits(value);
  return d.length === 11 ? cpfValid(d) : d.length === 14 ? cnpjValid(d) : false;
}
