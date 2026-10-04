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
  assertEquals(d.titulo, "Estruturar página de autoridade técnica");
  assert(d.descricao.includes("backlinks") && d.descricao.includes("Provas sociais"));
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
