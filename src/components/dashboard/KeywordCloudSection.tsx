import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Cloud, Sparkles } from "lucide-react";
import { KeywordDetailSheet } from "@/components/dashboard/KeywordDetailSheet";
import {
  asKeywordCloud,
  countsBySentiment,
  diffCloud,
  fontSizeFor,
  mergeCloudsAcrossPeriod,
  totalMentions,
  type KeywordCloud,
  type KeywordCloudEntry,
  type KeywordSentiment,
} from "@/lib/keyword-cloud";

interface Props {
  /** Nuvens das auditorias do período selecionado (mais antiga → mais recente). */
  cloudsInPeriod: unknown[];
  /** Nuvem da auditoria imediatamente anterior à última (para o modo Comparar). */
  previousCloud?: unknown;
  /** Quantidade de modelos de IA usados (default: 5). */
  totalModels?: number;
}

const sentimentClass: Record<KeywordSentiment, string> = {
  positive: "text-emerald-600 hover:text-emerald-700",
  neutral: "text-muted-foreground hover:text-foreground",
  negative: "text-red-600 hover:text-red-700",
};

const sentimentDot: Record<KeywordSentiment, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-muted-foreground/60",
  negative: "bg-red-500",
};

const sentimentLabel: Record<KeywordSentiment, string> = {
  positive: "positivos",
  neutral: "neutros",
  negative: "negativos",
};

export function KeywordCloudSection({ cloudsInPeriod, previousCloud, totalModels = 5 }: Props) {
  const [mode, setMode] = useState<"current" | "compare">("current");
  const [selected, setSelected] = useState<KeywordCloudEntry | null>(null);

  const aggregated: KeywordCloud = useMemo(
    () => mergeCloudsAcrossPeriod(cloudsInPeriod.map(asKeywordCloud)),
    [cloudsInPeriod],
  );

  const previous: KeywordCloud = useMemo(() => asKeywordCloud(previousCloud), [previousCloud]);

  const diff = useMemo(() => diffCloud(aggregated, previous), [aggregated, previous]);

  const counts = useMemo(() => countsBySentiment(aggregated), [aggregated]);
  const mentions = useMemo(() => totalMentions(aggregated), [aggregated]);
  const maxFreq = useMemo(
    () => aggregated.reduce((max, e) => Math.max(max, e.frequency), 0),
    [aggregated],
  );

  const newTerms = new Set(diff.added.map((e) => e.term.trim().toLowerCase()));
  const showCompare = mode === "compare" && previous.length > 0;

  // No modo Comparar, exibimos termos atuais + os removidos riscados.
  const displayed = useMemo(() => {
    if (!showCompare) return aggregated;
    return [
      ...aggregated,
      ...diff.removed.map((e) => ({ ...e, __removed: true } as typeof e & { __removed?: boolean })),
    ];
  }, [aggregated, diff, showCompare]);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3 px-1 gap-3 flex-wrap">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Cloud className="h-3.5 w-3.5" />
          Nuvem de percepção · como as IAs falam da sua marca
        </h2>
        {previous.length > 0 && (
          <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setMode("current")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                mode === "current"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              Atual
            </button>
            <button
              type="button"
              onClick={() => setMode("compare")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                mode === "compare"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              Comparar com anterior
            </button>
          </div>
        )}
      </div>

      <Card className="border-border">
        <CardContent className="p-6 md:p-8">
          {aggregated.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">Nenhuma nuvem disponível ainda</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Rode um novo Diagnóstico para que as IAs gerem o vocabulário com que descrevem sua marca.
              </p>
            </div>
          ) : (
            <>
              <TooltipProvider delayDuration={120}>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 min-h-[160px] py-4">
                  {displayed.map((entry) => {
                    const removed = (entry as { __removed?: boolean }).__removed === true;
                    const isNew = !removed && newTerms.has(entry.term.trim().toLowerCase()) && showCompare;
                    return (
                      <Tooltip key={`${entry.term}-${removed ? "rm" : "cur"}`}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            disabled={removed}
                            onClick={() => !removed && setSelected(entry)}
                            className={cn(
                              "font-display font-semibold leading-tight transition-colors bg-transparent border-0 p-0 m-0",
                              removed
                                ? "text-muted-foreground/50 line-through cursor-not-allowed"
                                : cn(
                                    sentimentClass[entry.sentiment],
                                    "cursor-pointer hover:underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:underline rounded-sm",
                                  ),
                              isNew && "underline decoration-dotted decoration-2 underline-offset-4",
                            )}
                            style={{ fontSize: `${fontSizeFor(entry.frequency, maxFreq)}px` }}
                            aria-label={
                              removed
                                ? `${entry.term} (removido)`
                                : `Ver detalhes de ${entry.term}`
                            }
                          >
                            {entry.term}
                            {isNew && (
                              <span className="ml-1.5 align-middle inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded">
                                novo
                              </span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {removed ? (
                            <>Termo presente na auditoria anterior, ausente agora.</>
                          ) : (
                            <>
                              Mencionado por {entry.mentioned_in_models} de {totalModels} IAs ·{" "}
                              {entry.frequency} {entry.frequency === 1 ? "vez" : "vezes"}
                              <span className="block mt-1 text-muted-foreground">clique para ver exemplos</span>
                            </>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>

              <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-4 flex-wrap">
                  {(["positive", "neutral", "negative"] as KeywordSentiment[]).map((s) => (
                    <span key={s} className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", sentimentDot[s])} />
                      <strong className="text-foreground font-semibold">{counts[s]}</strong> {sentimentLabel[s]}
                    </span>
                  ))}
                </div>
                <span>
                  Termos vindos de até {totalModels} modelos · {mentions} menções analisadas
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
