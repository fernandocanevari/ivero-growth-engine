/**
 * Brand prefetch — dispara a leitura do site (ivero-onboarding-analyze) em
 * paralelo ao desbloqueio do relatório no gate do preview, e guarda o
 * resultado em sessionStorage para o onboarding reaproveitar.
 *
 * Chave própria (`ivero:brandPrefetch`), separada de `ivero:lastDiagnostic`,
 * que continua sendo o registro do diagnóstico (simulate-ai) intocado.
 */
import { supabase } from "@/integrations/supabase/client";

export const BRAND_PREFETCH_KEY = "ivero:brandPrefetch";

export type BrandPrefetchResult = {
  brand_name: string;
  description: string;
  sector: string;
  competitors: string[];
  normalized_url: string;
};

type BrandPrefetchRecord = {
  url: string; // URL normalizada usada como chave de comparação
  at: number;
  result: BrandPrefetchResult;
};

/** Normaliza para comparação: sem protocolo, sem www, sem barra final, minúsculo. */
export function normalizePrefetchUrl(raw: string): string {
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

export function clearBrandPrefetch(): void {
  try {
    sessionStorage.removeItem(BRAND_PREFETCH_KEY);
  } catch {
    /* ignora */
  }
}

function writeBrandPrefetch(record: BrandPrefetchRecord): void {
  try {
    sessionStorage.setItem(BRAND_PREFETCH_KEY, JSON.stringify(record));
  } catch {
    /* ignora: sessionStorage indisponível */
  }
}

/**
 * Lê o prefetch se ele existir e corresponder à URL pedida.
 * Retorna null em qualquer miss (sem prefetch, URL diferente, JSON inválido).
 */
export function readBrandPrefetch(forUrl: string): BrandPrefetchResult | null {
  try {
    const raw = sessionStorage.getItem(BRAND_PREFETCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrandPrefetchRecord;
    if (!parsed?.result || !parsed?.url) return null;
    if (parsed.url !== normalizePrefetchUrl(forUrl)) return null;
    const r = parsed.result;
    if (!r.brand_name && !r.description && !r.sector) return null;
    return r;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget: dispara a análise do site e grava o resultado.
 * Nunca lança — falha silenciosamente (o onboarding roda a análise normal).
 * Resolve com `true` quando o prefetch ficou disponível.
 */
export function startBrandPrefetch(rawUrl: string): Promise<boolean> {
  const key = normalizePrefetchUrl(rawUrl);
  if (!key) return Promise.resolve(false);

  clearBrandPrefetch();

  return (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("ivero-onboarding-analyze", {
        body: { url: rawUrl.trim() },
      });
      if (error || !data || data.error) return false;
      const result: BrandPrefetchResult = {
        brand_name: data.brand_name || "",
        description: data.description || "",
        sector: data.sector || "",
        competitors: Array.isArray(data.competitors) ? data.competitors : [],
        normalized_url: data.normalized_url || rawUrl.trim(),
      };
      if (!result.brand_name && !result.description && !result.sector) return false;
      writeBrandPrefetch({ url: key, at: Date.now(), result });
      return true;
    } catch {
      return false;
    }
  })();
}
