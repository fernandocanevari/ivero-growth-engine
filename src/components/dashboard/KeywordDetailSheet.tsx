import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Quote, MessageSquare, Sparkles, Bot } from "lucide-react";
import type { KeywordCloudEntry, KeywordSentiment } from "@/lib/keyword-cloud";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: KeywordCloudEntry | null;
  totalModels?: number;
}

const sentimentLabel: Record<KeywordSentiment, string> = {
  positive: "Positivo",
  neutral: "Neutro",
  negative: "Negativo",
};

const sentimentBadge: Record<KeywordSentiment, string> = {
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-muted text-muted-foreground border-border",
  negative: "bg-red-50 text-red-700 border-red-200",
};

const sentimentDot: Record<KeywordSentiment, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-muted-foreground/60",
  negative: "bg-red-500",
};

const sentimentBar: Record<KeywordSentiment, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-muted-foreground/50",
  negative: "bg-red-500",
};

export function KeywordDetailSheet({ open, onOpenChange, entry, totalModels = 5 }: Props) {
  if (!entry) return null;

  const examples = entry.examples ?? [];
  const models = entry.models ?? [];
  const maxCount = models.reduce((m, x) => Math.max(m, x.count), 0) || 1;
  const strongest = models[0]?.model;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded border",
                sentimentBadge[entry.sentiment],
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", sentimentDot[entry.sentiment])} />
              {sentimentLabel[entry.sentiment]}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {entry.frequency} {entry.frequency === 1 ? "menção" : "menções"} ·{" "}
              {entry.mentioned_in_models} de {totalModels} IAs
            </span>
          </div>
          <SheetTitle className="text-2xl md:text-3xl font-display font-bold leading-tight">
            "{entry.term}"
          </SheetTitle>
          <SheetDescription className="text-sm">
            Como esse termo aparece nas respostas das IAs sobre sua marca.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-6" />

        {/* Força por modelo */}
        <section>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            Força por modelo de IA
          </h3>
          {models.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Distribuição por modelo indisponível para este termo.
            </p>
          ) : (
            <div className="space-y-2.5">
              {models.map((m) => {
                const pct = Math.round((m.count / maxCount) * 100);
                const isTop = m.model === strongest;
                return (
                  <div key={m.model} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn("font-medium", isTop ? "text-foreground" : "text-foreground/80")}>
                        {m.model}
                        {isTop && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                            <Sparkles className="h-3 w-3" /> mais forte
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {m.count} {m.count === 1 ? "menção" : "menções"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", sentimentBar[entry.sentiment])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Exemplos de frases */}
        <section className="mt-6">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Exemplos de como as IAs usaram este termo
          </h3>
          {examples.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhuma frase de exemplo capturada nesta auditoria. Rode um novo Diagnóstico
                para gerar exemplos atualizados.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {examples.map((ex, idx) => (
                <li
                  key={`${ex.model}-${idx}`}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start gap-2">
                    <Quote className="h-4 w-4 text-primary/70 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/90 leading-relaxed italic">
                        "{ex.quote}"
                      </p>
                      <p className="mt-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                        — {ex.model}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
          Termos e frases extraídos das respostas reais dos modelos durante o último Diagnóstico.
          Esta é a base lexical que sustenta o tom (verde/amarelo/vermelho) das tags de percepção.
        </p>
      </SheetContent>
    </Sheet>
  );
}
