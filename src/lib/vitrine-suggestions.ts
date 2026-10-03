/**
 * Sugestões iniciais de perguntas de compra da Vitrine IA.
 *
 * Ordem de prioridade dos termos (sempre da marca ativa):
 *  1. Palavras-chave da nuvem da auditoria.
 *  2. Termos de produto extraídos da descrição da marca.
 *  3. Parte ESPECÍFICA do setor (depois do hífen/dois-pontos).
 *  4. A categoria macro (antes do hífen) nunca vira termo de pergunta.
 *
 * Só gera texto para preencher o campo — não toca em score, plano ou cobrança.
 */

const TEMPLATES: Array<(termo: string, regiao: string | null) => string> = [
  (t) => `melhor ${t} custo-benefício`,
  (t) => `onde comprar ${t} com bom preço`,
  (t) => `qual a melhor loja para comprar ${t}`,
  (t, r) => (r ? `melhor ${t} em ${r}` : `${t} mais recomendado hoje`),
  (t) => `${t}: quais marcas valem a pena`,
];

function limpaTermo(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palavras genéricas que não são produto. */
const RUIDO = new Set([
  "produtos", "produto", "consumidores", "clientes", "pessoas", "marca", "marcas",
  "qualidade", "praticidade", "dia", "alimentação", "brasil", "país", "todo",
  "família", "receitas", "inspirações", "soluções", "serviços",
]);

/**
 * Extrai a enumeração de produtos da descrição. Ex.: "oferecendo produtos como
 * frios, embutidos, aves e congelados para consumidores" → [frios, embutidos, aves, congelados].
 */
export function extractProductTerms(description?: string | null): string[] {
  if (!description) return [];
  const text = description.toLowerCase();
  const re = /\b(?:como|incluindo|de)\s+([a-zà-ú]+(?:\s[a-zà-ú]+)?(?:,\s*[a-zà-ú]+(?:\s[a-zà-ú]+)?)+\s+e\s+[a-zà-ú]+(?:\s[a-zà-ú]+)?)(?=\s+(?:para|com|que|em|no|na|do|da|ao)\b|[.;,]|$)/gi;
  // Pega a enumeração mais longa (lista real de produtos).
  let m: RegExpExecArray | null = null;
  for (const cur of text.matchAll(re)) {
    if (!m || cur[1].length > m[1].length) m = cur as RegExpExecArray;
  }
  if (!m) return [];
  return m[1]
    .split(/,|\s+e\s+/)
    .map((t) => limpaTermo(t))
    .filter((t) => t.length >= 3 && t.split(" ").length <= 3 && !RUIDO.has(t));
}

/** Parte específica do setor (após hífen/travessão/dois-pontos). Sem ela, nada. */
export function specificSectorTerm(sector?: string | null): string | null {
  if (!sector) return null;
  const parts = sector.split(/\s[-–—:]\s|\s?[–—:]\s?/);
  if (parts.length < 2) return null;
  const spec = limpaTermo(parts.slice(1).join(" "));
  return spec.length >= 3 ? spec : null;
}

export function buildVitrineSuggestions(input: {
  sector?: string | null;
  brandName?: string | null;
  description?: string | null;
  keywords?: string[];
  regiao?: string | null;
  jaCadastradas?: string[];
  limite?: number;
}): string[] {
  const limite = input.limite ?? 5;
  const regiao = input.regiao?.trim() || null;
  const marca = input.brandName ? limpaTermo(input.brandName) : null;

  const termos: string[] = [];
  const add = (t: string) => {
    if (t.length < 3) return;
    if (marca && t.includes(marca)) return;
    if (!termos.includes(t)) termos.push(t);
  };

  for (const k of input.keywords ?? []) add(limpaTermo(k));
  if (termos.length === 0) extractProductTerms(input.description).forEach(add);
  if (termos.length === 0) {
    const spec = specificSectorTerm(input.sector);
    if (spec) add(spec);
  }

  if (termos.length === 0) return [];

  const jaExiste = new Set((input.jaCadastradas ?? []).map((p) => limpaTermo(p)));
  const out: string[] = [];
  for (let i = 0; i < TEMPLATES.length && out.length < limite; i++) {
    const frase = TEMPLATES[i](termos[i % termos.length], regiao);
    if (jaExiste.has(limpaTermo(frase))) continue;
    if (out.some((o) => limpaTermo(o) === limpaTermo(frase))) continue;
    out.push(frase.charAt(0).toUpperCase() + frase.slice(1));
  }
  return out;
}
