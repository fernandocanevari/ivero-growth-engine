import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the current user has at least one diagnostic record
 * (in audit_reports or analysis_history).
 */
export function useHasDiagnostic() {
  const [hasDiagnostic, setHasDiagnostic] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setHasDiagnostic(false);
            setIsLoading(false);
          }
          return;
        }

        const [audits, history] = await Promise.all([
          supabase
            .from("audit_reports")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("analysis_history")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        const total = (audits.count ?? 0) + (history.count ?? 0);
        if (!cancelled) {
          setHasDiagnostic(total > 0);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn("[useHasDiagnostic] failed:", err);
        if (!cancelled) {
          setHasDiagnostic(false);
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { hasDiagnostic, isLoading };
}
