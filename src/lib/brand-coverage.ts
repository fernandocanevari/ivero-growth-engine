export type CoverageType = "national" | "regional";

export interface BrandCoverage {
  coverage_type: CoverageType;
  coverage_city?: string | null;
  coverage_state?: string | null;
  coverage_region?: string | null;
}

export const BRAZIL_UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export type UF = typeof BRAZIL_UFS[number];

/**
 * Retorna um trecho de contexto pronto para injetar em prompts de IA.
 * Usado pelo motor de diagnóstico para calibrar a análise de acordo
 * com a abrangência declarada pela marca.
 */
export function getGeoContext(c: BrandCoverage): string {
  if (c.coverage_type === "regional") {
    const city = (c.coverage_city ?? "").trim();
    const state = (c.coverage_state ?? "").trim();
    const region = (c.coverage_region ?? "").trim();
    const base = `Marca com atuação regional: ${city}/${state}`;
    return region ? `${base}, região "${region}".` : `${base}.`;
  }
  return "Marca com atuação nacional no Brasil.";
}
