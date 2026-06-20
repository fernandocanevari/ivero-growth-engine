import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Eye, ShieldCheck, Target, Rocket, Sparkles,
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown,
  Info, LineChart as LineChartIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoTooltip } from "@/components/InfoTooltip";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { useAuditReports } from "@/hooks/useAuditReports";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

/* ── Icon resolution from pillar_details[].icon.displayName ── */
const ICON_MAP: Record<string, typeof Eye> = {
  Eye, ShieldCheck, Target, Rocket, Sparkles,
};
const DEFAULT_PILLAR_ICON: Record<string, typeof Eye> = {
  Clareza: Eye,
  Autoridade: ShieldCheck,
  Conversão: Target,
  Posicionamento: Rocket,
  Relevância: Sparkles,
};

/* ── Criterios shape (from PreviewPage / simulate-ai) ── */
interface PillarCriterion {
  nome: string;
  score: number;
  peso: number;
  justificativa?: string;
  consenso?: unknown;
}

interface PillarDetail {
  name: string;
  score: number;
  status?: string;
  color?: "red" | "amber" | "emerald" | string;
  summary?: string;
  recommendation?: string;
  strengths?: string[];
  weaknesses?: string[];
  criterios?: PillarCriterion[];
  icon?: { displayName?: string };
}

function getScoreColor(score: number) {
  if (score >= 70) return "emerald";
  if (score >= 50) return "amber";
  return "red";
}

function criterionStatus(score: number) {
  if (score >= 70) return "good";
  if (score >= 50) return "moderate";
  return "critical";
}

function getStatusStyle(status: string) {
  if (status === "good") return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
  if (status === "moderate") return "bg-amber-50 text-amber-700 border-amber-200/60";
  return "bg-red-50 text-red-700 border-red-200/60";
}

function MetricBar({ label, value, status }: { label: string; value: string; status: string }) {
  const numericValue = parseInt(value);
  const barColor = status === "good" ? "bg-emerald-500" : status === "moderate" ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getStatusStyle(status)}`}>
          {value}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${numericValue}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

interface ResolvedPillar {
  key: string;
  score: number;
  previousScore: number;
  icon: typeof Eye;
  status: string;
  summary: string;
  impact: string;
  strengths: string[];
  weaknesses: string[];
  criterios: PillarCriterion[];
}

/* ── Pillar Detail Card ── */
function PillarDetailCard({
  pillar,
  evolution,
}: {
  pillar: ResolvedPillar;
  evolution: { month: string; score: number }[];
}) {
  const PillarIcon = pillar.icon;
  const color = getScoreColor(pillar.score);
  const trend = pillar.score - pillar.previousScore;
  const trendUp = trend >= 0;
  const statusBg =
    color === "emerald"
      ? "bg-emerald-50 border-emerald-200/60 text-emerald-700"
      : color === "amber"
      ? "bg-amber-50 border-amber-200/60 text-amber-700"
      : "bg-red-50 border-red-200/60 text-red-700";
  const barColor = color === "emerald" ? "bg-emerald-500" : color === "amber" ? "bg-amber-500" : "bg-red-500";

  const hasCriterios = pillar.criterios.length > 0;
  const hasEvolution = evolution.length >= 2;
  const hasAnalysis = pillar.strengths.length > 0 || pillar.weaknesses.length > 0 || !!pillar.summary;

  const tabs: { value: string; label: string }[] = [];
  if (hasCriterios) tabs.push({ value: "metrics", label: "Métricas" });
  if (hasEvolution) tabs.push({ value: "evolution", label: "Evolução" });
  if (hasAnalysis) tabs.push({ value: "analysis", label: "Análise" });
  const defaultTab = tabs[0]?.value;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-6 border-b border-border/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-ivero-gradient shadow-sm">
                <PillarIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-foreground">{pillar.key}</h3>
                {pillar.summary && (
                  <p className="text-sm text-muted-foreground mt-0.5">{pillar.summary}</p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-display font-bold text-foreground">{pillar.score}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <div className="flex items-center gap-2 mt-1 justify-end">
                {pillar.status && (
                  <Badge className={`text-[10px] border ${statusBg}`} variant="outline">
                    {pillar.status}
                  </Badge>
                )}
                {pillar.previousScore !== pillar.score && (
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
                    {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {trendUp ? "+" : ""}{trend}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-4 space-y-2">
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${barColor}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${pillar.score}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Sua marca: {pillar.score}%</span>
            </div>
          </div>
        </div>

        {tabs.length > 0 && defaultTab && (
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border/60 bg-transparent px-6 h-auto">
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {hasCriterios && (
              <TabsContent value="metrics" className="p-6 space-y-4 mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pillar.criterios.map((c, i) => (
                    <MetricBar
                      key={`${c.nome}-${i}`}
                      label={c.nome}
                      value={`${Math.round(c.score)}%`}
                      status={criterionStatus(c.score)}
                    />
                  ))}
                </div>
              </TabsContent>
            )}

            {hasEvolution && (
              <TabsContent value="evolution" className="p-6 mt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-primary inline-block" /> Sua marca</span>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={evolution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} name="Sua marca" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {pillar.previousScore !== pillar.score && (
                    <div className={`rounded-xl p-3 border text-xs ${trendUp ? "bg-emerald-50/80 border-emerald-200/60 text-emerald-700" : "bg-red-50/80 border-red-200/60 text-red-700"}`}>
                      {trendUp
                        ? `↗ ${pillar.key} cresceu ${trend} pontos desde a análise anterior. Continue investindo nessa direção.`
                        : `↘ ${pillar.key} caiu ${Math.abs(trend)} pontos desde a análise anterior. Ação imediata recomendada.`}
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {hasAnalysis && (
              <TabsContent value="analysis" className="p-6 space-y-5 mt-0">
                {pillar.strengths.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Análise detectada</p>
                    <div className="space-y-1.5">
                      {pillar.strengths.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-foreground">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pillar.weaknesses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Impacto competitivo</p>
                    <div className="space-y-1.5">
                      {pillar.weaknesses.map((w, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="text-foreground">{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pillar.summary && (
                  <div className={`rounded-xl p-4 border ${
                    color === "red" ? "bg-red-50/80 border-red-200/60" :
                    color === "amber" ? "bg-amber-50/80 border-amber-200/60" :
                    "bg-emerald-50/80 border-emerald-200/60"
                  }`}>
                    <p className={`text-sm font-medium ${
                      color === "red" ? "text-red-700" :
                      color === "amber" ? "text-amber-700" : "text-emerald-700"
                    }`}>
                      {pillar.summary}
                    </p>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Map analysis_history pillar key → DB column ── */
const PILLAR_DB_COLUMN: Record<string, keyof import("@/hooks/useAnalysisHistory").AnalysisRecord> = {
  Clareza: "clarity_score",
  Autoridade: "authority_score",
  Conversão: "conversion_score",
  Posicionamento: "positioning_score",
  Relevância: "experience_score",
};

export default function PilaresPage() {
  const { data: settings, isLoading: brandLoading } = useBrandSettings();
  const { reports, isLoading: reportsLoading } = useAuditReports();
  const { history, isLoading: historyLoading } = useAnalysisHistory();
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const displayName = settings?.brand_name || "sua marca";

  const latestReport = reports[0]; // sorted DESC in hook
  const previousAnalysis = history.length >= 2 ? history[history.length - 2] : null;

  const resolvedPillars: ResolvedPillar[] = useMemo(() => {
    const details = (latestReport?.pillar_details ?? []) as PillarDetail[];
    return details.map((d) => {
      const iconName = d.icon?.displayName;
      const Icon = (iconName && ICON_MAP[iconName]) || DEFAULT_PILLAR_ICON[d.name] || Sparkles;
      const col = PILLAR_DB_COLUMN[d.name];
      const previousScore = col && previousAnalysis ? (previousAnalysis[col] as number) ?? d.score : d.score;
      return {
        key: d.name,
        score: d.score ?? 0,
        previousScore,
        icon: Icon,
        status: d.status ?? "",
        summary: d.summary ?? "",
        impact: d.recommendation ?? "",
        strengths: Array.isArray(d.strengths) ? d.strengths : [],
        weaknesses: Array.isArray(d.weaknesses) ? d.weaknesses : [],
        criterios: Array.isArray(d.criterios) ? d.criterios : [],
      };
    });
  }, [latestReport, previousAnalysis]);

  const evolutionByPillar = useMemo(() => {
    const map: Record<string, { month: string; score: number }[]> = {};
    if (history.length < 2) return map;
    const fmt = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    };
    for (const [pillarKey, col] of Object.entries(PILLAR_DB_COLUMN)) {
      map[pillarKey] = history.map((h) => ({
        month: fmt(h.created_at),
        score: (h[col] as number) ?? 0,
      }));
    }
    return map;
  }, [history]);

  const radarData = useMemo(() => {
    if (latestReport?.radar_data?.length) return latestReport.radar_data;
    return resolvedPillars.map((p) => ({ subject: p.key, value: p.score, fullMark: 100 }));
  }, [latestReport, resolvedPillars]);

  if (brandLoading || reportsLoading || historyLoading) return null;

  // EMPTY STATE — no audits AND no analysis yet
  if (!latestReport && history.length === 0) {
    return (
      <EmptyStatePage
        icon={<LineChartIcon className="h-12 w-12" />}
        title="📈 Evolução Estratégica"
        subtitle={`Acompanhe a evolução dos pilares que determinam se a IA recomenda ${displayName}.`}
        message="Rode seu primeiro diagnóstico para ver sua Evolução Estratégica"
        description="Assim que sua primeira análise for concluída, o radar, os scores por pilar e a evolução temporal aparecerão aqui."
        hasBrand={!!settings?.brand_name}
        cta={{ label: "Rodar diagnóstico", to: "/dashboard/diagnostico" }}
      />
    );
  }

  const filteredPillars = selectedPillar
    ? resolvedPillars.filter((p) => p.key === selectedPillar)
    : resolvedPillars;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <motion.div {...fade}>
        <h1 className="text-2xl font-bold font-display text-foreground">
          📈 Evolução Estratégica
        </h1>
        <p className="text-xs text-muted-foreground mt-1 italic">Monitoramento contínuo — Acompanhe a evolução dos seus pilares ao longo do tempo</p>
        <p className="text-muted-foreground mt-1">
          Métricas detalhadas e evolução temporal de cada pilar que determina se a IA recomenda {displayName}.
        </p>
      </motion.div>

      {/* Radar Overview */}
      {radarData.length > 0 && (
        <motion.div {...fade} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Visão Geral dos Pilares
                    <InfoTooltip text="Score atual da sua marca em cada pilar estratégico, conforme última auditoria." />
                  </h2>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.6} />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Sua Marca" dataKey="value" stroke="hsl(var(--primary))" fill="url(#radarGradPilares)" fillOpacity={0.3} strokeWidth={2.5} />
                        <defs>
                          <linearGradient id="radarGradPilares" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="hsl(265 70% 28%)" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="hsl(330 85% 55%)" stopOpacity={0.4} />
                          </linearGradient>
                        </defs>
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Quick stats */}
                {resolvedPillars.length > 0 && (
                  <div className="lg:w-64 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Resumo por pilar</p>
                    {resolvedPillars.map((p) => {
                      const color = getScoreColor(p.score);
                      const isSelected = selectedPillar === p.key;
                      const delta = p.score - p.previousScore;
                      return (
                        <button
                          key={p.key}
                          onClick={() => setSelectedPillar(isSelected ? null : p.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                            isSelected
                              ? "border-primary/40 bg-primary/5 shadow-sm"
                              : "border-border/60 bg-card hover:border-primary/20 hover:bg-primary/5"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <p.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium text-foreground">{p.key}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${
                              color === "emerald" ? "text-emerald-600" :
                              color === "amber" ? "text-amber-600" : "text-red-600"
                            }`}>{p.score}</span>
                            {delta !== 0 && (
                              <span className={`text-[10px] ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                {delta >= 0 ? "↑" : "↓"}{Math.abs(delta)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {selectedPillar && (
                      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setSelectedPillar(null)}>
                        Ver todos os pilares
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Pillar Detail Cards */}
      {filteredPillars.length > 0 && (
        <div className="space-y-6">
          {filteredPillars.map((pillar, idx) => (
            <motion.div key={pillar.key} {...fade} transition={{ delay: 0.1 + idx * 0.05 }}>
              <PillarDetailCard
                pillar={pillar}
                evolution={evolutionByPillar[pillar.key] ?? []}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Info: only analysis_history exists (no full audit yet) */}
      {!latestReport && history.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 flex items-start gap-3">
            <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Detalhamento por pilar em breve</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sua primeira auditoria completa ainda não foi gerada. Os scores já registrados aparecem na evolução, e os pilares detalhados aparecerão após a próxima auditoria.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
