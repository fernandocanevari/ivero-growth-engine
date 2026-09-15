/**
 * Sugestões iniciais de perguntas de compra da Vitrine IA.
 *
 * Objetivo: a tela nunca abrir vazia. As perguntas saem do setor e das
 * palavras-chave que já temos da marca, no formato que um consumidor
 * realmente digita antes de comprar.
 *
 * Isto é só geração de texto para preencher o campo — não toca em score,
 * plano ou cobrança.
 */

const TEMPLATES: Array<(termo: string, regiao: string | null) => string> = [
  (t) => `melhor ${t} custo-benefício`,
  (t) => `onde comprar ${t} com bom preço`,
  (t) => `qual a melhor loja para comprar ${t}`,
  (t, r) => (r ? `melhor ${t} em ${r}` : `${t} mais recomendado hoje`),
  (t) => `${t}: quais marcas valem a pena`,
];

/** Remove plural simples e ruído para o termo caber na frase. */
function limpaTermo(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildVitrineSuggestions(input: {
  sector?: string | null;
  brandName?: string | null;
  keywords?: string[];
  regiao?: string | null;
  jaCadastradas?: string[];
  limite?: number;
}): string[] {
  const limite = input.limite ?? 5;
  const regiao = input.regiao?.trim() || null;

  const termos: string[] = [];
  for (const k of input.keywords ?? []) {
    const t = limpaTermo(k);
    // Palavra-chave com o nome da marca não serve: mede a própria marca,
    // não a pergunta de compra do mercado.
    if (t.length < 3) continue;
    if (input.brandName && t.includes(limpaTermo(input.brandName))) continue;
    if (!termos.includes(t)) termos.push(t);
  }
  const setor = input.sector ? limpaTermo(input.sector) : null;
  if (setor && !termos.includes(setor)) termos.unshift(setor);

  if (termos.length === 0) return [];

  const jaExiste = new Set((input.jaCadastradas ?? []).map((p) => limpaTermo(p)));
  const out: string[] = [];

  for (let i = 0; i < TEMPLATES.length && out.length < limite; i++) {
    const termo = termos[i % termos.length];
    const frase = TEMPLATES[i](termo, regiao);
    if (jaExiste.has(limpaTermo(frase))) continue;
    if (out.some((o) => limpaTermo(o) === limpaTermo(frase))) continue;
    out.push(frase.charAt(0).toUpperCase() + frase.slice(1));
  }

  return out;
}
