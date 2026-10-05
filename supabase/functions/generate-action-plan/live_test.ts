import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fallbackAction, selectTargets } from "./logic.ts";
import { generateWithLlm, lastUsage } from "./llm.ts";

// Dados reais da Sadia (brand_settings + audit_reports); todos os pilares >= 60 → consolidação.
const SADIA = {
  nome: "Sadia",
  setor: "Alimentos e Bebidas - Produtos alimentícios processados e in natura",
  descricao: "A Sadia é uma das maiores marcas de alimentos do Brasil, oferecendo produtos como frios, embutidos, aves e congelados para consumidores em todo o país.",
};
const PILLARS = [
  { name: "Clareza", score: 81, hasData: true, criterios: [] },
  { name: "Autoridade", score: 83, hasData: true, criterios: [] },
  { name: "Conversão", score: 73, hasData: true, criterios: [
    { nome: "CTAs claros e visíveis", score: 75, justificativa: "Botões de navegação e links para produtos existem, mas CTAs para ação imediata (newsletter, receitas) são discretos." },
    { nome: "Oferta ou próximo passo definido", score: 69, justificativa: "O próximo passo principal é a exploração do portfólio de produtos e receitas, mas a conversão final para compra não é o foco direto do site." },
  ] },
  { name: "Posicionamento", score: 82, hasData: true, criterios: [] },
];

Deno.test({
  name: "IA real: gera ação válida para a Sadia",
  ignore: !Deno.env.get("LOVABLE_API_KEY"),
  sanitizeResources: false, sanitizeOps: false,
  fn: async () => {
    const targets = selectTargets(PILLARS);
    const map = await generateWithLlm(SADIA, targets);
    const a = map.get("Conversão");
    console.log("IA →", JSON.stringify(a, null, 2));
    console.log("uso", JSON.stringify(lastUsage));
    assert(a, "IA não retornou ação válida para Conversão");
    assert(!/bebida/i.test(a.titulo + a.descricao));
    assert(a.titulo.length <= 70 && a.descricao.length <= 220 && a.impacto_estimado.length <= 120);
    console.log("tamanhos", a.titulo.length, a.descricao.length, a.impacto_estimado.length);
  },
});

Deno.test({
  name: "fallback: chave inválida derruba a IA e o mapa determinístico assume",
  sanitizeResources: false, sanitizeOps: false,
  fn: async () => {
    const targets = selectTargets(PILLARS);
    let failed = false;
    try { await generateWithLlm(SADIA, targets, "chave-invalida"); } catch { failed = true; }
    assert(failed);
    const d = fallbackAction(targets[0]);
    console.log("fallback →", JSON.stringify(d, null, 2));
    assert(d.titulo.length > 0);
  },
});
