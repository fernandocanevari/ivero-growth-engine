import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fallbackAction, isDuplicate, selectTargets, validateDraft } from "./logic.ts";

const p = (name: string, score: number, crit: [string, number][] = []) => ({
  name, score, hasData: true, criterios: crit.map(([nome, s]) => ({ nome, score: s, justificativa: "j" })),
});

Deno.test("pilares fracos: prioridade por faixa, teto de 4, mais baixos primeiro", () => {
  const t = selectTargets([p("Clareza", 35), p("Autoridade", 50), p("Conversão", 20), p("Posicionamento", 59), p("Relevância", 45)]);
  assertEquals(t.length, 4);
  assertEquals(t.map((x) => x.pillar), ["Conversão", "Clareza", "Relevância", "Autoridade"]);
  assertEquals(t.map((x) => x.prioridade), ["alta", "alta", "media", "media"]);
});

Deno.test("todos >= 60: 1 consolidação baixa no mais baixo", () => {
  const t = selectTargets([p("Clareza", 79), p("Autoridade", 61), p("Conversão", 90)]);
  assertEquals(t.length, 1);
  assertEquals(t[0].pillar, "Autoridade");
  assertEquals(t[0].prioridade, "baixa");
  assert(t[0].consolidacao);
});

Deno.test("pilar sem dados é ignorado", () => {
  assertEquals(selectTargets([{ name: "Clareza", score: null, hasData: false }]), []);
});

Deno.test("fallback usa título do mapa + recBad + sub-critérios fracos, sem números no impacto", () => {
  const [t] = selectTargets([p("Autoridade", 30, [["Provas sociais", 25], ["Expertise", 70]])]);
  const d = fallbackAction(t);
  assertEquals(d.titulo, PILLAR_ACTION_TITLE.Autoridade);
  assert(d.descricao.includes("depoimentos") && d.descricao.includes("Provas sociais"));
  assert(!/\d/.test(d.impacto_estimado));
  assert(validateDraft(d));
});

Deno.test("schema rejeita promessa numérica e campos vazios", () => {
  assertEquals(validateDraft({ titulo: "Publicar FAQ", descricao: "x".repeat(30), impacto_estimado: "+15 pontos" }), null);
  assertEquals(validateDraft({ titulo: "", descricao: "x".repeat(30), impacto_estimado: "Melhora a clareza" }), null);
});

Deno.test("dedupe: sugestão aberta na mesma categoria bloqueia; concluída não; outra categoria não", () => {
  const ex = [{ titulo: "Qualquer", categoria: "clareza", status: "pendente", origem: "automatico" }];
  assert(isDuplicate("clareza", "Nova", ex));
  assert(!isDuplicate("autoridade", "Nova", ex));
  assert(!isDuplicate("clareza", "Nova", [{ ...ex[0], status: "concluido" }]));
  assert(isDuplicate("clareza", "Reescrever headline do site", [{ titulo: "Reescrever a headline", categoria: "clareza", status: "em_andamento", origem: "manual" }]));
});

// ---- Regra "gera para todos os planos" ----
import { countSentences, eligiblePlan, LIMITS, PILLAR_ACTION_TITLE } from "./logic.ts";
import { generateWithLlm } from "./llm.ts";
const NOW = new Date("2026-10-05T12:00:00Z");
const futuro = "2026-10-10T00:00:00Z", passado = "2026-10-01T00:00:00Z";

Deno.test("elegível: Presença, Influência e Autoridade, pagos e em teste grátis", () => {
  for (const plano of ["presenca", "influencia", "autoridade"]) {
    assertEquals(eligiblePlan(plano, { status: "ativo" }, NOW), plano);
    assertEquals(eligiblePlan(plano, { status: "trial", trial_ends_at: futuro }, NOW), plano);
  }
});

Deno.test("excluído: cancelado, teste grátis vencido, sem plano", () => {
  assertEquals(eligiblePlan("autoridade", { status: "cancelado" }, NOW), null);
  assertEquals(eligiblePlan("autoridade", { status: "expirado" }, NOW), null);
  assertEquals(eligiblePlan("presenca", { status: "trial", trial_ends_at: passado }, NOW), null);
  assertEquals(eligiblePlan(null, { status: "ativo" }, NOW), null);
  assertEquals(eligiblePlan("autoridade", null, NOW), null);
  assertEquals(eligiblePlan("plano_inexistente", { status: "ativo" }, NOW), null);
});

// ---- Limites de texto ----
const ok = { titulo: "Publique depoimentos de clientes no site", descricao: "Reúna depoimentos reais e publique na página inicial. Mostre também menções na imprensa.", impacto_estimado: "Ajuda as IAs a reconhecer a marca como confiável." };

Deno.test("limites: título > 70, descrição > 220 ou > 2 frases, impacto > 120 ou > 1 frase são rejeitados", () => {
  assert(validateDraft(ok));
  assertEquals(validateDraft({ ...ok, titulo: "a".repeat(71) }), null);
  assert(validateDraft({ ...ok, titulo: "a".repeat(70) }));
  assertEquals(validateDraft({ ...ok, descricao: "b".repeat(221) }), null);
  assertEquals(validateDraft({ ...ok, descricao: "Faça isso agora. Depois faça aquilo. Por fim revise tudo." }), null);
  assertEquals(validateDraft({ ...ok, impacto_estimado: "c".repeat(121) }), null);
  assertEquals(validateDraft({ ...ok, impacto_estimado: "Ajuda a marca. Melhora a imagem." }), null);
});

Deno.test("fallback: todos os textos padrão respeitam os limites (correção e consolidação)", () => {
  for (const pillar of Object.keys(PILLAR_ACTION_TITLE)) {
    for (const score of [30, 50, 80]) {
      const [t] = selectTargets([p(pillar, score, [["Um sub-critério com nome bem comprido para testar o limite", 20]])]);
      const d = fallbackAction(t);
      assert(validateDraft(d), `${pillar}/${score}: ${JSON.stringify(d)}`);
      assert(d.titulo.length <= LIMITS.titulo && d.descricao.length <= LIMITS.descricao && d.impacto_estimado.length <= LIMITS.impacto);
      assert(countSentences(d.descricao) <= 2 && countSentences(d.impacto_estimado) === 1);
    }
  }
});

Deno.test("IA: texto longo → nova tentativa mais curta; se falhar de novo, pilar fica para o texto padrão", async () => {
  const targets = selectTargets([p("Clareza", 30), p("Autoridade", 50)]);
  const prompts: string[] = [];
  const longo = { ...ok, descricao: "x".repeat(300) };
  const fake = async (prompt: string) => {
    prompts.push(prompt);
    if (prompts.length === 1) return [{ pilar: "Clareza", ...ok }, { pilar: "Autoridade", ...longo }];
    return [{ pilar: "Autoridade", ...longo }];
  };
  const map = await generateWithLlm({ nome: "X", setor: "", descricao: "" }, targets, "k", fake);
  assertEquals(prompts.length, 2);
  assert(prompts[1].includes("longa demais") && !prompts[1].includes('"pilar":"Clareza"'));
  assert(map.has("Clareza") && !map.has("Autoridade"));
  const ok2 = await generateWithLlm({ nome: "X", setor: "", descricao: "" }, targets, "k",
    async (pr) => pr.includes("longa demais") ? [{ pilar: "Autoridade", ...ok }] : [{ pilar: "Clareza", ...ok }, { pilar: "Autoridade", ...longo }]);
  assert(ok2.has("Autoridade"));
});
