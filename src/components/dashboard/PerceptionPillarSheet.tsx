import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { PerceptionTagBadge } from "@/components/dashboard/PerceptionTagBadge";
import { PILLAR_EXPLANATIONS } from "@/lib/perception-explanations";
import type { PerceptionTone, PillarKey } from "@/lib/perception-tags";
import { Lightbulb, Target, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerceptionPillarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pillar: PillarKey | null;
  tone: PerceptionTone | null;
  score: number | null;
  labels: string[];
}

const toneAccent: Record<PerceptionTone, string> = {
  green: "text-emerald-600",
  yellow: "text-amber-600",
  red: "text-red-600",
};

const toneBgSoft: Record<PerceptionTone, string> = {
  green: "bg-emerald-50 border-emerald-200",
  yellow: "bg-amber-50 border-amber-200",
  red: "bg-red-50 border-red-200",
};

export function PerceptionPillarSheet({
  open,
  onOpenChange,
  pillar,
  tone,
  score,
  labels,
}: PerceptionPillarSheetProps) {
  if (!pillar || !tone) return null;
  const exp = PILLAR_EXPLANATIONS[pillar];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {labels.map((l) => (
              <PerceptionTagBadge key={l} tone={tone} label={l} />
            ))}
          </div>
          <SheetTitle className="text-2xl font-display">
            {pillar}
            {score !== null && (
              <span className={cn("ml-3 text-2xl font-bold", toneAccent[tone])}>
                {score}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="text-sm">{exp.summary}</SheetDescription>
        </SheetHeader>

        <Separator className="my-6" />

        {/* Por que esse tom */}
        <section className={cn("rounded-lg border p-4", toneBgSoft[tone])}>
          <div className="flex items-start gap-2">
            <Lightbulb className={cn("h-5 w-5 mt-0.5 shrink-0", toneAccent[tone])} />
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                Por que esse tom?
              </p>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {exp.rationale[tone]}
              </p>
            </div>
          </div>
        </section>

        {/* Sub-critérios */}
        <section className="mt-6">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
            Sinais avaliados no Radar Estratégico
          </h3>
          <div className="space-y-3">
            {exp.subCriteria.map((sc) => (
              <div
                key={sc.label}
                className="rounded-lg border border-border p-3 bg-card"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-foreground">
                    {sc.label}
                  </p>
                  <span className="text-xs font-mono text-muted-foreground">
                    peso {sc.weight}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {sc.signal}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Próximo passo */}
        <section className="mt-6">
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <Target className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                Próximo passo
              </p>
              <p className="text-sm text-foreground/90 leading-relaxed flex items-center gap-1.5">
                {exp.nextStep[tone]} <ArrowRight className="h-3.5 w-3.5 inline" />
              </p>
            </div>
          </div>
        </section>
      </SheetContent>
    </Sheet>
  );
}
