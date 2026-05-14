import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Circle, ArrowRight, Sparkles, X, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useDashboardOnboarding } from "@/hooks/useDashboardOnboarding";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Step {
  key: "diagnostico" | "competitor" | "score" | "acoes";
  label: string;
  to: string;
  done: boolean;
}

const SNOOZE_PREFIX = "ivero_dashboard_checklist_snoozed_until:";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function OnboardingChecklistCard() {
  const navigate = useNavigate();
  const { data: progress, isLoading } = useDashboardOnboarding();
  const { data: settings } = useBrandSettings();
  const [userId, setUserId] = useState<string | null>(null);
  const [snoozedUntil, setSnoozedUntil] = useState<number>(0);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active || !user) return;
      setUserId(user.id);
      const until = Number(localStorage.getItem(SNOOZE_PREFIX + user.id) || 0);
      setSnoozedUntil(until);
    });
    return () => {
      active = false;
    };
  }, []);

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
  const isSnoozed = Date.now() < snoozedUntil;

  const handleSnooze = () => {
    if (!userId) return;
    const until = Date.now() + SNOOZE_MS;
    localStorage.setItem(SNOOZE_PREFIX + userId, String(until));
    setSnoozedUntil(until);
    toast({
      title: "Checklist ocultado por 7 dias",
      description: 'Você pode reexibir a qualquer momento clicando em "Reexibir checklist".',
    });
  };

  const handleRestore = () => {
    if (!userId) return;
    localStorage.removeItem(SNOOZE_PREFIX + userId);
    setSnoozedUntil(0);
  };

  if (isSnoozed) {
    return (
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestore}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ListChecks className="h-4 w-4" />
          Reexibir checklist
        </Button>
      </div>
    );
  }

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
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs font-semibold text-primary">{pct}%</span>
              <button
                type="button"
                onClick={handleSnooze}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Ocultar checklist por 7 dias"
                title="Ocultar por 7 dias"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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

          <button
            type="button"
            onClick={handleSnooze}
            className="mt-4 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Lembrar daqui a 7 dias
          </button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
