import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { usePerceptionAlerts } from "@/hooks/usePerceptionAlerts";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";
import { PerceptionTagBadge } from "@/components/dashboard/PerceptionTagBadge";
import { PerceptionPillarSheet } from "@/components/dashboard/PerceptionPillarSheet";
import { KeywordCloudSection } from "@/components/dashboard/KeywordCloudSection";
import {
  buildPerceptionSnapshot,
  isEmptySnapshot,
  VERDICT_COPY,
  PILLAR_KEYS,
  type PerceptionSnapshot,
  type PerceptionTone,
  type PillarKey,
} from "@/lib/perception-tags";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Tags,
  ArrowRight,
  Bell,
  Equal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type PillarScores = {
  clarity_score: number;
  authority_score: number;
  conversion_score: number;
  positioning_score: number;
  experience_score: number;
};

const pillarScoreKey: Record<PillarKey, keyof PillarScores> = {
  Clareza: "clarity_score",
  Autoridade: "authority_score",
  Conversão: "conversion_score",
  Posicionamento: "positioning_score",
  Relevância: "experience_score",
};

function snapshotForRecord(record: PillarScores & { perception_snapshot?: unknown }): PerceptionSnapshot {
  if (!isEmptySnapshot(record.perception_snapshot)) {
    return record.perception_snapshot as PerceptionSnapshot;
  }
  return buildPerceptionSnapshot({
    clarity: record.clarity_score,
    authority: record.authority_score,
    conversion: record.conversion_score,
    positioning: record.positioning_score,
    experience: record.experience_score,
  });
}

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

const TONE_RANK: Record<PerceptionTone, number> = { green: 3, yellow: 2, red: 1 };
const TONE_LABEL: Record<PerceptionTone, string> = {
  green: "verde",
  yellow: "amarelo",
  red: "vermelho",
};

type PeriodKey = "7" | "30" | "90" | "all";

const PERIOD_OPTIONS: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: "7", label: "7 dias", days: 7 },
  { key: "30", label: "30 dias", days: 30 },
  { key: "90", label: "90 dias", days: 90 },
  { key: "all", label: "Tudo", days: null },
];

export default function TagsPercepcaoPage() {
  const navigate = useNavigate();
  const { history, isLoading } = useAnalysisHistory();
  const { alerts: perceptionAlerts, unreadCount } = usePerceptionAlerts();

  const [period, setPeriod] = useState<PeriodKey>("30");
  const [sheetState, setSheetState] = useState<{
    open: boolean;
    pillar: PillarKey | null;
    tone: PerceptionTone | null;
    score: number | null;
    labels: string[];
  }>({ open: false, pillar: null, tone: null, score: null, labels: [] });

  /** Histórico filtrado pelo período selecionado, ordenado mais antigo → mais recente. */
  const filteredHistory = useMemo(() => {
    const days = PERIOD_OPTIONS.find((p) => p.key === period)?.days;
    const sorted = [...history].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    if (!days) return sorted;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return sorted.filter((r) => new Date(r.created_at).getTime() >= cutoff);
  }, [history, period]);

  const lastAnalysis = filteredHistory[filteredHistory.length - 1] ?? null;
  const previousAnalysis =
    filteredHistory.length >= 2
      ? filteredHistory[filteredHistory.length - 2]
      : null;

  const lastSnapshot = useMemo(
    () => (lastAnalysis ? snapshotForRecord(lastAnalysis) : null),
    [lastAnalysis],
  );
  const prevSnapshot = useMemo(
    () => (previousAnalysis ? snapshotForRecord(previousAnalysis) : null),
    [previousAnalysis],
  );

  /** Timeline: até 8 entradas dentro do período (mais recente primeiro). */
  const timeline = useMemo(() => {
    return [...filteredHistory]
      .reverse()
      .slice(0, 8)
      .map((rec) => ({
        date: rec.created_at,
        snapshot: snapshotForRecord(rec),
      }));
  }, [filteredHistory]);

  const counts = useMemo(() => {
    if (!lastSnapshot) return { green: 0, yellow: 0, red: 0 };
    const tones = Object.values(lastSnapshot.tags).map((t) => t.tone);
    return {
      green: tones.filter((t) => t === "green").length,
      yellow: tones.filter((t) => t === "yellow").length,
      red: tones.filter((t) => t === "red").length,
    };
  }, [lastSnapshot]);

  /** Diferenças entre auditoria atual e anterior (mesmo período). */
  const transitions = useMemo(() => {
    if (!lastSnapshot || !prevSnapshot) return [];
    return PILLAR_KEYS.map((pillar) => {
      const from = prevSnapshot.tags[pillar].tone;
      const to = lastSnapshot.tags[pillar].tone;
      const direction =
        TONE_RANK[to] > TONE_RANK[from]
          ? "up"
          : TONE_RANK[to] < TONE_RANK[from]
            ? "down"
            : "same";
      return { pillar, from, to, direction };
    });
  }, [lastSnapshot, prevSnapshot]);

  const recentAlerts = useMemo(
    () => perceptionAlerts.filter((a) => a.severity !== "success").slice(0, 3),
    [perceptionAlerts],
  );

  if (isLoading && history.length === 0) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (history.length === 0) {
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

  const openTag = (pillar: PillarKey) => {
    if (!lastSnapshot || !lastAnalysis) return;
    const tag = lastSnapshot.tags[pillar];
    const score = (lastAnalysis as unknown as PillarScores)[pillarScoreKey[pillar]];
    setSheetState({
      open: true,
      pillar,
      tone: tag.tone,
      score,
      labels: tag.labels,
    });
  };

  const noDataInPeriod = !lastSnapshot;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground flex items-center gap-2">
            <Tags className="h-7 w-7 text-primary" />
            Tags de Percepção da IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Como as IAs leem os sinais do seu site, traduzido em evidências.
          </p>
        </div>
        {lastAnalysis && (
          <span className="text-xs text-muted-foreground">
            última auditoria · {formatRelative(lastAnalysis.created_at)}
          </span>
        )}
      </header>

      {/* Filtro de período */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setPeriod(opt.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                period === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {filteredHistory.length} auditoria{filteredHistory.length !== 1 ? "s" : ""} no período
        </span>
      </div>

      {noDataInPeriod ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma auditoria registrada nos últimos {PERIOD_OPTIONS.find((p) => p.key === period)?.label.toLowerCase()}.
              Tente um período mais amplo ou rode um novo Diagnóstico.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Banner de alertas de percepção */}
          {recentAlerts.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 flex items-start gap-3">
                <Bell className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {unreadCount} alerta{unreadCount !== 1 ? "s" : ""} de percepção ativo{unreadCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {recentAlerts
                      .map((a) => `${a.pillar} · ${TONE_LABEL[a.fromTone]} → ${TONE_LABEL[a.toTone]}`)
                      .join("  ·  ")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/dashboard/alertas")}
                  className="shrink-0"
                >
                  Ver alertas <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

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
                {(() => {
                  const VerdictIcon = verdictIcon[lastSnapshot.verdict];
                  return (
                    <VerdictIcon
                      className={cn(
                        "h-10 w-10 shrink-0 mt-1",
                        verdictIconColor[lastSnapshot.verdict],
                      )}
                    />
                  );
                })()}
                <div className="flex-1">
                  <p
                    className={cn(
                      "text-2xl md:text-3xl font-bold font-display",
                      verdictIconColor[lastSnapshot.verdict],
                    )}
                  >
                    {VERDICT_COPY[lastSnapshot.verdict].label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                    {VERDICT_COPY[lastSnapshot.verdict].description}
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

          {/* Comparativo atual vs anterior */}
          {transitions.length > 0 && previousAnalysis && (
            <section>
              <div className="flex items-baseline justify-between mb-3 px-1">
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
                  Comparativo vs auditoria anterior
                </h2>
                <span className="text-xs text-muted-foreground">
                  {formatDateShort(previousAnalysis.created_at)} → {formatDateShort(lastAnalysis!.created_at)}
                </span>
              </div>
              <Card className="border-border">
                <CardContent className="p-0 divide-y divide-border">
                  {transitions.map((t) => {
                    const Icon =
                      t.direction === "up"
                        ? TrendingUp
                        : t.direction === "down"
                          ? TrendingDown
                          : Equal;
                    const accent =
                      t.direction === "up"
                        ? "text-emerald-600"
                        : t.direction === "down"
                          ? "text-red-600"
                          : "text-muted-foreground";
                    return (
                      <div
                        key={t.pillar}
                        className="flex items-center gap-4 p-4"
                      >
                        <span className="text-sm font-semibold text-foreground w-32 md:w-40 shrink-0">
                          {t.pillar}
                        </span>
                        <div className="flex items-center gap-2 flex-1 flex-wrap">
                          <PerceptionTagBadge tone={t.from} label={TONE_LABEL[t.from]} />
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <PerceptionTagBadge tone={t.to} label={TONE_LABEL[t.to]} />
                        </div>
                        <span
                          className={cn(
                            "flex items-center gap-1 text-xs font-semibold uppercase tracking-wide shrink-0",
                            accent,
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {t.direction === "up" && "melhorou"}
                          {t.direction === "down" && "piorou"}
                          {t.direction === "same" && "estável"}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Nuvem de percepção — vocabulário concreto que as IAs usam */}
          <KeywordCloudSection
            cloudsInPeriod={filteredHistory.map((r) => (r as { keyword_cloud?: unknown }).keyword_cloud)}
            previousCloud={(previousAnalysis as { keyword_cloud?: unknown } | null)?.keyword_cloud}
          />

          {/* Percepções por pilar (clicáveis) */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 px-1">
              Percepções por pilar · clique em uma tag para ver os sinais avaliados
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
                        <PerceptionTagBadge
                          key={label}
                          tone={tag.tone}
                          label={label}
                          onClick={() => openTag(pillar)}
                        />
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
                Evolução da percepção · {timeline.length} auditorias no período
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
                                title={`${pillar}: ${TONE_LABEL[tone]}`}
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
        </>
      )}

      <PerceptionPillarSheet
        open={sheetState.open}
        onOpenChange={(o) => setSheetState((s) => ({ ...s, open: o }))}
        pillar={sheetState.pillar}
        tone={sheetState.tone}
        score={sheetState.score}
        labels={sheetState.labels}
      />
    </div>
  );
}
