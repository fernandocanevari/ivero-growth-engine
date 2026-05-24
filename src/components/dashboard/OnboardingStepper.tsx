import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = { label: string; state: "done" | "current" | "pending" };

const STEPS: Step[] = [
  { label: "Cadastro", state: "done" },
  { label: "Diagnóstico IA", state: "current" },
  { label: "Score GEO", state: "pending" },
  { label: "Plano de Ação", state: "pending" },
];

export function OnboardingStepper() {
  return (
    <div className="w-full bg-white border border-border rounded-xl p-5">
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2 min-w-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition",
                  step.state === "done" && "bg-emerald-100 text-emerald-700",
                  step.state === "current" && "bg-primary text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/0.15)] animate-pulse",
                  step.state === "pending" && "bg-muted text-muted-foreground"
                )}
              >
                {step.state === "done" ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium text-center leading-tight",
                  step.state === "current" ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-[2px] mx-2 mb-5 bg-muted relative overflow-hidden">
                <div
                  className={cn(
                    "absolute inset-0 transition-all",
                    step.state === "done" ? "bg-gradient-to-r from-emerald-400 to-primary" : "bg-transparent"
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
