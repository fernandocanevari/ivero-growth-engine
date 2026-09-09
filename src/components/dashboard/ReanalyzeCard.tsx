import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Clock, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { runDiagnostic, persistDiagnostic, extractBrandFromUrl } from "@/lib/diagnostic-engine";

/**
 * Cartão de re-análise ("Realizar nova análise").
 *
 * Fica no cabeçalho de Visibilidade IA, portanto disponível nas 3 abas.
 * Roda o MESMO motor do onboarding/preview (runDiagnostic → simulate-ai) e
 * persiste o resultado verdadeiro; nunca fabrica número. Cooldown de 30 dias
 * preservado via useAnalysisHistory.
 */
export function ReanalyzeCard() {
  const { data: settings } = useBrandSettings();
  const { canReanalyze, daysRemaining, daysSinceLast } = useAnalysisHistory();
  const queryClient = useQueryClient();
  const [reanalyzing, setReanalyzing] = useState(false);

  const handleReanalyze = async () => {
    if (!canReanalyze || reanalyzing) return;
    setReanalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessão expirada. Entre novamente para rodar a análise.");
        return;
      }

      const siteUrl = settings?.website ?? "";
      const brandName = settings?.brand_name || extractBrandFromUrl(siteUrl);
      if (!brandName) {
        toast.error("Complete o perfil da marca antes de rodar uma nova análise.");
        return;
      }

      const diag = await runDiagnostic(brandName);
      if (!diag.ok) {
        toast.error("As IAs não responderam agora. Tente novamente em alguns minutos.");
        return;
      }

      await persistDiagnostic({
        userId: user.id,
        siteUrl,
        source: "reanalise",
        result: diag,
        writeAnalysisHistory: true,
      });

      queryClient.invalidateQueries({ queryKey: ["audit-reports"] });
      queryClient.invalidateQueries({ queryKey: ["analysis-history"] });
      queryClient.invalidateQueries({ queryKey: ["has-diagnostic"] });
      toast.success("Nova análise realizada com sucesso!");
    } catch (e) {
      console.error("Re-análise falhou:", e);
      toast.error("Erro ao realizar análise. Tente novamente.");
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card>
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Re-análise do site</p>
              {daysSinceLast !== null ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Última análise há {daysSinceLast} {daysSinceLast === 1 ? "dia" : "dias"}
                  {!canReanalyze && ` · Disponível em ${daysRemaining} dias`}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma análise salva ainda</p>
              )}
            </div>
          </div>
          <Button onClick={handleReanalyze} disabled={!canReanalyze || reanalyzing} size="sm" className="gap-2">
            {reanalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
            {canReanalyze ? "Realizar nova análise" : `Aguarde ${daysRemaining} dias`}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
