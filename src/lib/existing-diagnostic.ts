import { supabase } from "@/integrations/supabase/client";

/**
 * Sinal único de "esse cliente já tem diagnóstico".
 *
 * Usado para pular a etapa "Seu diagnóstico personalizado" do onboarding
 * (caminho 1 — quem já viu a revelação no /preview) e para não rodar
 * simulate-ai de novo. Se o snapshot só existe em sessionStorage, ele é
 * adotado (gravado em audit_reports) para o dashboard também reconhecer.
 */
export interface ExistingDiagnostic {
  overallScore: number;
  pillarDetails: unknown[];
}

const SESSION_KEY = "ivero:lastDiagnostic";
const ADOPTED_KEY = "ivero:audit_adopted";

function readSessionSnapshot(): Record<string, unknown> | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const payload = raw ? JSON.parse(raw) : null;
    if (payload && typeof payload.geoScore === "number" && payload.geoScore > 0) {
      return payload as Record<string, unknown>;
    }
  } catch {
    /* storage indisponível ou corrompido */
  }
  return null;
}

export async function resolveExistingDiagnostic(
  userId: string,
): Promise<ExistingDiagnostic | null> {
  const { data: lastAudit } = await supabase
    .from("audit_reports")
    .select("overall_score, pillar_details")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const audit = lastAudit as { overall_score?: number; pillar_details?: unknown } | null;
  if (audit && typeof audit.overall_score === "number" && audit.overall_score > 0) {
    return {
      overallScore: audit.overall_score,
      pillarDetails: Array.isArray(audit.pillar_details) ? audit.pillar_details : [],
    };
  }

  const payload = readSessionSnapshot();
  if (!payload) return null;

  // Adoção: grava o snapshot do preview para o histórico e o card do Painel
  // enxergarem o mesmo diagnóstico que o cliente acabou de ver.
  const { error } = await supabase.from("audit_reports").insert({
    user_id: userId,
    source: "preview",
    site_url: (payload.siteUrl as string) ?? "",
    overall_score: payload.geoScore as number,
    status_label: "",
    radar_data: payload.radar ?? [],
    pillar_details: payload.pillarDetails ?? [],
    keyword_cloud: payload.keyword_cloud ?? [],
    ai_engines: payload.aiEngines ?? [],
  } as never);
  if (!error) {
    try {
      sessionStorage.setItem(ADOPTED_KEY, "1");
    } catch {
      /* ignora */
    }
  } else {
    console.warn("[existing-diagnostic] adoção falhou:", error.message);
  }

  return {
    overallScore: payload.geoScore as number,
    pillarDetails: Array.isArray(payload.pillarDetails) ? (payload.pillarDetails as unknown[]) : [],
  };
}
