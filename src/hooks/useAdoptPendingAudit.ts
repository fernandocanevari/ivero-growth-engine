import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Quando um lead anônimo roda o /preview e depois cria conta + entra no
 * dashboard, esta hook "adota" o snapshot que ficou em sessionStorage e
 * grava como audit_report no banco — assim ele aparece no histórico
 * mesmo se o cliente fechar a aba.
 *
 * Roda 1x por sessão de login. Marca como adotado em sessionStorage
 * para não duplicar.
 */
const ADOPTED_KEY = "ivero:audit_adopted";

export function useAdoptPendingAudit() {
  const queryClient = useQueryClient();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        if (sessionStorage.getItem(ADOPTED_KEY) === "1") return;
        const raw = sessionStorage.getItem("ivero:lastDiagnostic");
        if (!raw) return;
        const payload = JSON.parse(raw);
        if (!payload || typeof payload.geoScore !== "number") return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Já existe algum audit_report? Se sim, não duplica.
        const { count } = await supabase
          .from("audit_reports")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        if ((count ?? 0) > 0) {
          sessionStorage.setItem(ADOPTED_KEY, "1");
          return;
        }

        await supabase.from("audit_reports").insert({
          user_id: user.id,
          source: "preview",
          site_url: payload.siteUrl ?? "",
          overall_score: payload.geoScore ?? 0,
          status_label: "",
          radar_data: payload.radar ?? [],
          pillar_details: payload.pillarDetails ?? [],
          keyword_cloud: payload.keyword_cloud ?? [],
          ai_engines: payload.aiEngines ?? [],
        } as never);

        sessionStorage.setItem(ADOPTED_KEY, "1");
        queryClient.invalidateQueries({ queryKey: ["audit-reports"] });
      } catch (e) {
        console.warn("Audit adoption skipped:", e);
      }
    })();
  }, [queryClient]);
}
