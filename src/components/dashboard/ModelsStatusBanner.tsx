import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { MODELS_IN_STANDBY, MODELS_ACTIVE, TOTAL_MODELS } from "@/lib/ai-models-status";

const DISMISS_KEY = "ivero:models-banner-dismissed";

export default function ModelsStatusBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (MODELS_IN_STANDBY.length === 0 || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="px-4 py-2.5 flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="flex-1 text-xs sm:text-sm text-amber-900 leading-relaxed">
          Análises rodando com <strong>{MODELS_ACTIVE.length} de {TOTAL_MODELS} modelos de IA</strong> —{" "}
          {MODELS_IN_STANDBY.join(" e ")} estão em modo de implementação. As métricas refletem a média dos modelos ativos ({MODELS_ACTIVE.join(", ")}).
        </p>
        <button
          onClick={handleDismiss}
          className="text-amber-700 hover:text-amber-900 transition-colors shrink-0"
          aria-label="Dispensar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
