import { useEffect, useState } from "react";
import { Cpu, X, Zap } from "lucide-react";
import { MODELS_IN_STANDBY, MODELS_ACTIVE, TOTAL_MODELS } from "@/lib/ai-models-status";

const DISMISS_KEY = "ivero:models-banner-dismissed";

export default function ModelsStatusBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const allActive = MODELS_IN_STANDBY.length === 0;

  return (
    <div className={allActive ? "border-b border-emerald-200 bg-emerald-50" : "border-b border-amber-200 bg-amber-50"}>
      <div className="px-4 py-2.5 flex items-start gap-3">
        {allActive ? (
          <Zap className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
        ) : (
          <Cpu className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        )}
        <p className="flex-1 text-xs sm:text-sm leading-relaxed">
          {allActive ? (
            <span className="text-emerald-900">
              Todos os <strong>{TOTAL_MODELS} modelos de IA</strong> ativos —{" "}
              {MODELS_ACTIVE.join(", ")} — estão operacionais. Suas análises refletem o máximo de cobertura.
            </span>
          ) : (
            <span className="text-amber-900">
              Análises rodando com <strong>{MODELS_ACTIVE.length} de {TOTAL_MODELS} modelos de IA</strong> —{" "}
              {MODELS_IN_STANDBY.join(" e ")} estão em modo de implementação. As métricas refletem a média dos modelos ativos ({MODELS_ACTIVE.join(", ")}).
            </span>
          )}
        </p>
        <button
          onClick={handleDismiss}
          className={allActive ? "text-emerald-700 hover:text-emerald-900 transition-colors shrink-0" : "text-amber-700 hover:text-amber-900 transition-colors shrink-0"}
          aria-label="Dispensar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
