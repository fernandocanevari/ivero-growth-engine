import { motion } from "framer-motion";
import { Check, Circle, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useDashboardOnboarding } from "@/hooks/useDashboardOnboarding";
import { useBrandSettings } from "@/hooks/useBrandSettings";

interface Step {
  key: "diagnostico" | "competitor" | "score" | "acoes";
  label: string;
  to: string;
  done: boolean;
}

export function OnboardingChecklistCard() {
  const navigate = useNavigate();
  const { data: progress, isLoading } = useDashboardOnboarding();
  const { data: settings } = useBrandSettings();

  if (isLoading || !progress) return null;

  const hasCompetitor = !!(settings?.main_competitor && settings.main_competitor.trim().length);

  const steps: Step[] = [
    {
      key: "diagnostico",
      label: "Faça seu primeiro Diagnóstico IA",
      to: "/dashboard/diagnostico",
      done: progress.visited_diagnostico,
    },
    {
      key: "competitor",
      label: "Adicione um concorrente",
      to: "/dashboard/configuracoes",
      done: hasCompetitor,
    },
    {
      key: "score",
      label: "Veja seu Score GEO",
      to: "/dashboard/score",
      done: progress.visited_score,
    },
    {
      key: "acoes",
      label: "Crie seu primeiro Plano de Ação",
      to: "/dashboard/acoes",
      done: progress.visited_acoes,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;
  if (allDone) return null;

  const pct = Math.round((completed / steps.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold font-display text-foreground">
                  Por onde começar
                </h3>
                <p className="text-xs text-muted-foreground">
                  {completed} de {steps.length} concluídos
                </p>
              </div>
            </div>
            <div className="hidden sm:block text-xs font-semibold text-primary">{pct}%</div>
          </div>

          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden mb-4">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>

          <ul className="space-y-2">
            {steps.map((step) => (
              <li key={step.key}>
                <button
                  type="button"
                  onClick={() => navigate(step.to)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    step.done
                      ? "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
                      : "border-border bg-background hover:bg-secondary/50"
                  }`}
                >
                  {step.done ? (
                    <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={`flex-1 text-sm ${
                      step.done ? "text-muted-foreground line-through" : "text-foreground font-medium"
                    }`}
                  >
                    {step.label}
                  </span>
                  {!step.done && (
                    <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}
