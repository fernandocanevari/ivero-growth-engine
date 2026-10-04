// Lógica pura do gerador de Plano de Ação (sem rede/banco) — testável em Deno.

export type Categoria = "clareza" | "autoridade" | "conversao" | "posicionamento" | "relevancia";
export type Prioridade = "alta" | "media" | "baixa";

export const PILLAR_CATEGORY: Record<string, Categoria> = {
  Clareza: "clareza",
  Autoridade: "autoridade",
  "Conversão": "conversao",
  Posicionamento: "posicionamento",
  "Relevância": "relevancia",
};

// Espelho de PILLAR_ACTION_TITLE (PreviewPage) e recBad/recGood (diagnostic-engine).
export const PILLAR_ACTION_TITLE: Record<string, string> = {
  Clareza: "Reescrever headline e proposta de valor",
  Autoridade: "Estruturar página de autoridade técnica",
  "Conversão": "Criar landing pages para tráfego de IA",
  Posicionamento: "Definir e declarar o território de mercado",
  "Relevância": "Produzir conteúdo de cobertura semântica do nicho",
};
export const REC_BAD: Record<string, string> = {
  Clareza: "Reforce a proposta única de valor e a diferenciação competitiva para maximizar o impacto em respostas de IA.",
  Autoridade: "Invista em backlinks de alta qualidade, menções em mídia especializada e conteúdo técnico aprofundado.",
  "Conversão": "Crie landing pages específicas para visitantes vindos de respostas de IA, com contexto personalizado e prova social.",
  Posicionamento: "Adicione elementos aspiracionais e storytelling à comunicação para que IAs gerem respostas mais humanizadas.",
  "Relevância": "Produza conteúdo altamente relevante ao seu nicho e participe ativamente de discussões e publicações do setor.",
};
export const REC_GOOD: Record<string, string> = {
  Clareza: "Mantenha a comunicação clara e reforce a diferenciação competitiva.",
  Autoridade: "Continue investindo em conteúdo de autoridade e backlinks de qualidade.",
  "Conversão": "Otimize as landing pages para visitantes vindos de respostas de IA.",
  Posicionamento: "Mantenha o storytelling e adicione mais elementos de diferenciação.",
  "Relevância": "Mantenha a produção de conteúdo relevante ao nico e amplie a presença em discussões do setor.".replace("nico", "nicho"),
};

export interface Criterio { nome: string; score: number; justificativa?: string }
export interface Pillar { name: string; score: number | null; hasData?: boolean; criterios?: Criterio[] }

export interface Target {
  pillar: string;
  categoria: Categoria;
  score: number;
  prioridade: Prioridade;
  consolidacao: boolean;
  weak: Criterio[];
}

export const MAX_ACTIONS = 4;

/** Pilar fraco = score < 60 (alta < 40, média 40-59), 1 por pilar, teto 4. Sem fracos: 1 consolidação (baixa) no mais baixo. */
export function selectTargets(pillars: Pillar[]): Target[] {
  const valid = (pillars ?? []).filter(
    (p) => p && PILLAR_CATEGORY[p.name] && p.hasData !== false && typeof p.score === "number",
  ) as (Pillar & { score: number })[];
  if (valid.length === 0) return [];
  const sorted = [...valid].sort((a, b) => a.score - b.score);
  const weakCrit = (p: Pillar) => {
    const c = [...(p.criterios ?? [])].filter((x) => typeof x?.score === "number").sort((a, b) => a.score - b.score);
    const below = c.filter((x) => x.score < 60);
    return (below.length ? below : c.slice(0, 2)).slice(0, 3);
  };
  const weak = sorted.filter((p) => p.score < 60).slice(0, MAX_ACTIONS);
  if (weak.length) {
    return weak.map((p) => ({
      pillar: p.name, categoria: PILLAR_CATEGORY[p.name], score: p.score,
      prioridade: p.score < 40 ? "alta" : "media", consolidacao: false, weak: weakCrit(p),
    }));
  }
  const low = sorted[0];
  return [{ pillar: low.name, categoria: PILLAR_CATEGORY[low.name], score: low.score, prioridade: "baixa", consolidacao: true, weak: weakCrit(low) }];
}

export interface ActionDraft { titulo: string; descricao: string; impacto_estimado: string }

export function fallbackAction(t: Target): ActionDraft {
  const base = t.consolidacao ? REC_GOOD[t.pillar] : REC_BAD[t.pillar];
  const pontos = t.weak.map((c) => c.nome).filter(Boolean);
  const descricao = pontos.length ? `${base} Pontos a reforçar: ${pontos.join("; ")}.` : base;
  return {
    titulo: t.consolidacao ? `Consolidar ${t.pillar.toLowerCase()}: ${PILLAR_ACTION_TITLE[t.pillar].toLowerCase()}` : PILLAR_ACTION_TITLE[t.pillar],
    descricao,
    impacto_estimado: t.consolidacao
      ? `Ajuda a manter o pilar ${t.pillar} forte nas respostas das IAs.`
      : `Tende a fortalecer o pilar ${t.pillar}, hoje o ponto que mais limita a marca nas respostas das IAs.`,
  };
}

/** Validação do schema da IA: textos não vazios, tamanhos razoáveis, impacto sem promessa numérica. */
export function validateDraft(d: unknown): ActionDraft | null {
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;
  const t = typeof o.titulo === "string" ? o.titulo.trim() : "";
  const desc = typeof o.descricao === "string" ? o.descricao.trim() : "";
  const imp = typeof o.impacto_estimado === "string" ? o.impacto_estimado.trim() : "";
  if (t.length < 5 || t.length > 120 || desc.length < 20 || desc.length > 700 || imp.length < 5 || imp.length > 240) return null;
  if (/\d/.test(imp) || /\bpontos?\b|%/i.test(imp)) return null;
  return { titulo: t, descricao: desc, impacto_estimado: imp };
}

function tokens(s: string) {
  return new Set(
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 3),
  );
}
export function similar(a: string, b: string) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return false;
  let inter = 0;
  A.forEach((w) => B.has(w) && inter++);
  return inter / Math.min(A.size, B.size) >= 0.5;
}

export interface ExistingAction { titulo: string; categoria: string; status: string; origem: string }
/** Já existe ação aberta parecida na mesma categoria (ou sugestão automática aberta na mesma categoria)? */
export function isDuplicate(cat: string, titulo: string, existing: ExistingAction[]) {
  return existing.some(
    (e) => e.categoria === cat && e.status !== "concluido" && (e.origem === "automatico" || similar(e.titulo, titulo)),
  );
}
