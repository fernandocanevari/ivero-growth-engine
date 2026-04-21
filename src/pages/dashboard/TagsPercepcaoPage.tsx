import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";
import { PerceptionTagBadge } from "@/components/dashboard/PerceptionTagBadge";
import {
  buildPerceptionSnapshot,
  isEmptySnapshot,
  VERDICT_COPY,
  PILLAR_KEYS,
  type PerceptionSnapshot,
  type PillarKey,
} from "@/lib/perception-tags";
import { CheckCircle2, AlertTriangle, XCircle, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

function snapshotForRecord(record: {
  clarity_score: number;
  authority_score: number;
  conversion_score: number;
  positioning_score: number;
  experience_score: number;
  perception_snapshot?: unknown;
}): PerceptionSnapshot {
  if (!isEmptySnapshot(record.perception_snapshot)) {
    return record.perception_snapshot as PerceptionSnapshot;
  }
  // Backfill em runtime para registros antigos
  return buildPerceptionSnapshot({
    clarity: record.clarity_score,
    authority: record.authority_score,
    conversion: record.conversion_score,
    positioning: record.positioning_score,
    experience: record.experience_score,
  });
}

const pillarScoreKey: Record<PillarKey, keyof PillarScores> = {
  Clareza: "clarity_score",
  Autoridade: "authority_score",
  Conversão: "conversion_score",
  Posicionamento: "positioning_score",
  Relevância: "experience_score",
};

type PillarScores = {
  clarity_score: number;
  authority_score: number;
  conversion_score: number;
  positioning_score: number;
  experience_score: number;
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `${days} dias atrás`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 mês atrás" : `${months} meses atrás`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const verdictIcon = {
  solid: CheckCircle2,
  partial: AlertTriangle,
  insufficient: XCircle,
} as const;

const verdictBg = {
  solid: "bg-emerald-50 border-emerald-200",
  partial: "bg-amber-50 border-amber-200",
  insufficient: "bg-red-50 border-red-200",
} as const;

const verdictIconColor = {
  solid: "text-emerald-600",
  partial: "text-amber-600",
  insufficient: "text-red-600",
} as const;

export default function TagsPercepcaoPage() {
  const { history, lastAnalysis, isLoading } = useAnalysisHistory();

  const lastSnapshot = useMemo(
    () => (lastAnalysis ? snapshotForRecord(lastAnalysis) : null),
    [lastAnalysis],
  );

  const timeline = useMemo(() => {
    return [...history]
      .reverse()
      .slice(0, 5)
      .map((rec) => ({
        date: rec.created_at,
        snapshot: snapshotForRecord(rec),
      }));
  }, [history]);

  const counts = useMemo(() => {
    if (!lastSnapshot) return { green: 0, yellow: 0, red: 0 };
    const tones = Object.values(lastSnapshot.tags).map((t) => t.tone);
    return {
      green: tones.filter((t) => t === "green").length,
      yellow: tones.filter((t) => t === "yellow").length,
      red: tones.filter((t) => t === "red").length,
    };
  }, [lastSnapshot]);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!lastAnalysis || !lastSnapshot) {
    return (
      <EmptyStatePage
        icon={<Tags className="h-10 w-10" />}
        title="Tags de Percepção da IA"
        subtitle="Como as IAs leem os sinais do seu site, traduzido em evidências."
        message="Execute seu primeiro Diagnóstico IA para ver as tags de percepção."
        hasBrand={true}
      />
    );
  }

  const verdict = VERDICT_COPY[lastSnapshot.verdict];
  const VerdictIcon = verdictIcon[lastSnapshot.verdict];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground flex items-center gap-2">
            <Tags className="h-7 w-7 text-primary" />
            Tags de Percepção da IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Como as IAs leem os sinais do seu site, traduzido em evidências.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          última auditoria · {formatRelative(lastAnalysis.created_at)}
        </span>
      </header>

      {/* Veredito */}
      <Card className={cn("border-2", verdictBg[lastSnapshot.verdict])}>
        <CardContent className="p-6 md:p-8">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Veredito
          </p>
          <p className="text-base md:text-lg font-medium text-foreground/80 mb-4">
            "Este site tem sinais suficientes para ser recomendado por uma IA?"
          </p>
          <div className="flex items-start gap-4">
            <VerdictIcon
              className={cn("h-10 w-10 shrink-0 mt-1", verdictIconColor[lastSnapshot.verdict])}
            />
            <div className="flex-1">
              <p
                className={cn(
                  "text-2xl md:text-3xl font-bold font-display",
                  verdictIconColor[lastSnapshot.verdict],
                )}
              >
                {verdict.label}
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                {verdict.description}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                {counts.green} verde{counts.green !== 1 ? "s" : ""} ·{" "}
                {counts.yellow} amarela{counts.yellow !== 1 ? "s" : ""} ·{" "}
                {counts.red} vermelha{counts.red !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Percepções por pilar */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 px-1">
          Percepções por pilar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLAR_KEYS.map((pillar) => {
            const tag = lastSnapshot.tags[pillar];
            const score = (lastAnalysis as unknown as PillarScores)[
              pillarScoreKey[pillar]
            ];
            return (
              <Card key={pillar} className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm font-semibold text-foreground">
                    <span>{pillar}</span>
                    <span className="text-2xl font-bold font-display text-foreground">
                      {score}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {tag.labels.map((label) => (
                    <PerceptionTagBadge key={label} tone={tag.tone} label={label} />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Evolução da percepção */}
      {timeline.length > 1 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Evolução da percepção · últimas {timeline.length} auditorias
          </h2>
          <Card className="border-border">
            <CardContent className="p-0 divide-y divide-border">
              {timeline.map((entry, idx) => {
                const v = VERDICT_COPY[entry.snapshot.verdict];
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">
                      {formatDateShort(entry.date)}
                    </span>
                    <div className="flex gap-1.5 flex-1">
                      {PILLAR_KEYS.map((pillar) => {
                        const tone = entry.snapshot.tags[pillar].tone;
                        return (
                          <span
                            key={pillar}
                            title={pillar}
                            className={cn(
                              "h-3 w-3 rounded-full",
                              tone === "green" && "bg-emerald-500",
                              tone === "yellow" && "bg-amber-500",
                              tone === "red" && "bg-red-500",
                            )}
                          />
                        );
                      })}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wide",
                        verdictIconColor[entry.snapshot.verdict],
                      )}
                    >
                      {v.label}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
