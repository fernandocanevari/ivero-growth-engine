import type { Database } from "@/integrations/supabase/types";

export type ActionPlan = Database["public"]["Tables"]["action_plans"]["Row"];
export type ActionCategory = Database["public"]["Enums"]["action_category"];
export type ActionPriority = Database["public"]["Enums"]["action_priority"];
export type ActionStatus = Database["public"]["Enums"]["action_status"];
export type ActionOrigin = Database["public"]["Enums"]["action_origin"];

export const ACTION_CATEGORY_LABELS: Record<ActionCategory, string> = {
  clareza: "Clareza",
  autoridade: "Autoridade",
  conversao: "Conversão",
  posicionamento: "Posicionamento",
  relevancia: "Relevância",
  autoridade_externa: "Autoridade Externa",
};

export const ACTION_PRIORITY_LABELS: Record<ActionPriority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

export const ACTION_ORIGIN_LABELS: Record<ActionOrigin, string> = {
  automatico: "Sugerido pela IA",
  manual: "Manual",
};

/**
 * Peso explícito para ordenação por prioridade.
 * NÃO confiar na ordem nativa de declaração do enum Postgres — é frágil
 * a `ALTER TYPE ... ADD VALUE`. Sempre ordenar client-side com este mapa.
 */
export const ACTION_PRIORITY_WEIGHT: Record<ActionPriority, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

export function sortActionPlans<T extends { prioridade: ActionPriority; created_at: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const w = ACTION_PRIORITY_WEIGHT[a.prioridade] - ACTION_PRIORITY_WEIGHT[b.prioridade];
    if (w !== 0) return w;
    // Mais recentes primeiro dentro da mesma prioridade
    return b.created_at.localeCompare(a.created_at);
  });
}
