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

// Textos padrão (fallback), curtos e sem jargão — respeitam os mesmos limites da IA.
export const PILLAR_ACTION_TITLE: Record<string, string> = {
  Clareza: "Reescrever o título e a proposta de valor do site",
  Autoridade: "Mostrar provas de experiência e reconhecimento",
  "Conversão": "Criar páginas para quem chega pelas IAs",
  Posicionamento: "Deixar claro em que mercado a marca atua",
  "Relevância": "Publicar conteúdo sobre os temas do seu nicho",
};
export const REC_BAD: Record<string, string> = {
  Clareza: "Diga em uma frase o que a marca faz e por que ela é diferente das concorrentes.",
  Autoridade: "Publique depoimentos, menções na imprensa e conteúdos que mostrem a experiência da marca.",
  "Conversão": "Crie páginas com o próximo passo claro e provas de clientes para quem chega pelas IAs.",
  Posicionamento: "Conte a história da marca e diga para quem ela é, com exemplos concretos.",
  "Relevância": "Publique conteúdos úteis sobre os assuntos do seu nicho e participe de debates do setor.",
};
export const REC_GOOD: Record<string, string> = {
  Clareza: "Mantenha a comunicação clara e reforce o que diferencia a marca.",
  Autoridade: "Continue publicando provas de experiência e menções de terceiros.",
  "Conversão": "Revise as páginas de entrada para deixar o próximo passo ainda mais claro.",
  Posicionamento: "Mantenha a história da marca e reforce o que a torna única.",
  "Relevância": "Mantenha conteúdos do nicho em dia e amplie a presença em debates do setor.",
};

// Limites de texto (cliente leigo).
export const LIMITS = { titulo: 70, descricao: 220, descricaoFrases: 2, impacto: 120, impactoFrases: 1 } as const;
export function countSentences(s: string) {
  return s.split(/[.!?]+(?:\s+|$)/).map((x) => x.trim()).filter(Boolean).length;
}

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
  // Acrescenta o sub-critério mais fraco só se couber inteiro no limite (nunca corta texto).
  const ponto = t.weak.map((c) => c.nome).find(Boolean);
  const comPonto = ponto ? `${base} Comece por: ${ponto}.` : base;
  const descricao = comPonto.length <= LIMITS.descricao ? comPonto : base;
  const titulo = PILLAR_ACTION_TITLE[t.pillar];
  return {
    titulo: t.consolidacao && titulo.length + 15 <= LIMITS.titulo ? `${titulo} (consolidação)` : titulo,
    descricao,
    impacto_estimado: t.consolidacao
      ? `Ajuda a manter o pilar ${t.pillar} forte nas respostas das IAs.`
      : `Tende a fortalecer o pilar ${t.pillar}, o que mais limita a marca nas IAs.`,
  };
}

/** Validação do schema da IA: textos não vazios, dentro dos LIMITS, impacto sem promessa numérica. */
export function validateDraft(d: unknown): ActionDraft | null {
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;
  const t = typeof o.titulo === "string" ? o.titulo.trim() : "";
  const desc = typeof o.descricao === "string" ? o.descricao.trim() : "";
  const imp = typeof o.impacto_estimado === "string" ? o.impacto_estimado.trim() : "";
  if (t.length < 5 || t.length > LIMITS.titulo) return null;
  if (desc.length < 20 || desc.length > LIMITS.descricao || countSentences(desc) > LIMITS.descricaoFrases) return null;
  if (imp.length < 5 || imp.length > LIMITS.impacto || countSentences(imp) > LIMITS.impactoFrases) return null;
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

// Elegibilidade para gerar: todos os planos (inclusive teste grátis). Excluídos:
// cancelado, teste grátis vencido (status ou trial_ends_at no passado) e sem plano.
export interface SubInfo { plano?: string | null; status?: string | null; trial_ends_at?: string | null }
const PLANOS = ["presenca", "influencia", "autoridade"];
export function eligiblePlan(plano: string | null | undefined, sub: SubInfo | null, now = new Date()): string | null {
  if (!plano || !PLANOS.includes(plano)) return null;
  if (!sub) return null;
  const st = sub.status ?? "";
  if (["cancelado", "expirado", "trial_expirado"].includes(st)) return null;
  if (st === "trial" && sub.trial_ends_at && new Date(sub.trial_ends_at).getTime() <= now.getTime()) return null;
  return plano;
}
