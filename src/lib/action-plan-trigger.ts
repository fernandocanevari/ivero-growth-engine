import { supabase } from "@/integrations/supabase/client";

/**
 * Dispara a geração automática do Plano de Ação em segundo plano.
 * Nunca aguardado e nunca lança: falha aqui não afeta nem atrasa o diagnóstico.
 */
export function triggerActionPlanGeneration(auditReportId: string | null | undefined, brandId: string | null) {
  if (!auditReportId) return;
  try {
    void supabase.functions
      .invoke("generate-action-plan", { body: { auditReportId, brandId } })
      .catch((e) => console.warn("[action-plan] geração em segundo plano falhou:", e));
  } catch (e) {
    console.warn("[action-plan] não foi possível disparar a geração:", e);
  }
}
