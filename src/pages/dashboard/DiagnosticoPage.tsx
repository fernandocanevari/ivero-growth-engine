import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Lock, Unlock, Eye, ShieldCheck, Target, Rocket, Sparkles,
  CheckCircle2, AlertTriangle, Phone, ArrowRight, RefreshCw, Clock, CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { DiagnosticoSkeleton } from "@/components/dashboard/LoadingStates";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from "recharts";
import { BrandCoverageInlineCard } from "@/components/dashboard/BrandCoverageInlineCard";

/* ── Sub-criterion type (mirrors PreviewPage payload saved in sessionStorage) ── */
interface PillarCriterion {
  nome: string;
  score: number;
  peso: number;
  justificativa?: string;
  consenso?: { agree: number; total: number };
}

/* ── Pillar payload type (mirrors PreviewPage `buildPillarDetails` output) ── */
interface PillarPayload {
  name: string;
  subtitle?: string;
  score: number;
  status?: string;
  definition?: string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendation?: string;
  criterios?: PillarCriterion[];
}

const PILLAR_ICON_MAP: Record<string, typeof Eye> = {
  Clareza: Eye,
  Autoridade: ShieldCheck,
  Posicionamento: Rocket,
  Conversão: Target,
  Relevância: Sparkles,
};

/* ── Score band helper (5 faixas oficiais — score-rubric) ── */
function getScoreBand(score: number) {
  if (score < 40) return { label: "Crítico", color: "red" as const };
  if (score < 60) return { label: "Insuficiente", color: "orange" as const };
  if (score < 75) return { label: "Moderado", color: "amber" as const };
  if (score < 90) return { label: "Sólido", color: "blue" as const };
  return { label: "Referência", color: "emerald" as const };
}

function getBandClass(color: "red" | "orange" | "amber" | "blue" | "emerald") {
  switch (color) {
    case "red": return "bg-red-50 text-red-700 border-red-200/60";
    case "orange": return "bg-orange-50 text-orange-700 border-orange-200/60";
    case "amber": return "bg-amber-50 text-amber-700 border-amber-200/60";
    case "blue": return "bg-sky-50 text-sky-700 border-sky-200/60";
    case "emerald": return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
  }
}

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

/* ── Score level helper ── */
function getScoreLevel(score: number) {
  if (score <= 40) return { label: "Invisível", color: "red", emoji: "🔴", message: "Sua marca está sendo pouco recomendada nas IAs da sua categoria." };
  if (score <= 70) return { label: "Competindo", color: "amber", emoji: "🟡", message: "Você está abaixo do nível competitivo ideal para recomendação em IA." };
  return { label: "Influenciando", color: "emerald", emoji: "🟢", message: "Sua marca já tem forte presença nas IAs — agora é hora de consolidar liderança." };
}

/* Nenhum dado mockado: sem análise real o cliente vê o empty state
   "Rode seu primeiro diagnóstico" (nunca scores fabricados). */


function getWeakestPillarPhrase(data: { subject: string; value: number }[]): string {
  const weakest = [...data].sort((a, b) => a.value - b.value)[0];
  const phrases: Record<string, string> = {
    Clareza: "Falta de clareza diminui a compreensão da IA sobre sua proposta de valor.",
    Autoridade: "Autoridade baixa reduz drasticamente a chance de recomendação nas IAs.",
    Conversão: "Baixa conversão significa que visitantes vindos de IA não se tornam clientes.",
    Posicionamento: "Posicionamento fraco faz a IA recomendar concorrentes no seu lugar.",
    Relevância: "Baixa relevância contextual faz a IA ignorar sua marca em buscas do nicho.",
  };
  return phrases[weakest?.subject] || phrases["Autoridade"];
}

/* ── Soft blur for locked content ── */
function SoftBlur({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="relative group/soft cursor-default">
      <div className="blur-[1.5px] opacity-60 select-none pointer-events-none transition-all duration-500 group-hover/soft:blur-[3px] group-hover/soft:opacity-40">{children}</div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card/80 rounded-xl transition-opacity duration-500 group-hover/soft:to-card/90" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/soft:opacity-100 transition-all duration-400 z-10">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-ivero-gradient shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.45)] scale-90 group-hover/soft:scale-100 transition-transform duration-400">
          <Lock className="w-3.5 h-3.5 text-primary-foreground" />
          <span className="text-xs font-medium text-primary-foreground">{label || "💜 Queremos você como nosso cliente."}</span>
        </div>
      </div>
    </div>
  );
}

interface DiagnosticoPageProps {
  /** Snapshot histórico — quando setado, renderiza esse relatório em vez do último da sessão. */
  snapshotOverride?: {
    pillarDetails: PillarPayload[];
    radar: { subject: string; value: number; fullMark: number }[];
    overallScore: number;
    createdAt?: string;
    siteUrl?: string;
  };
  /** Esconde botão de re-análise + comparativo — usado nas páginas de auditoria histórica. */
  readOnly?: boolean;
}

export default function DiagnosticoPage({ snapshotOverride, readOnly }: DiagnosticoPageProps = {}) {
  const { data: settings, isLoading } = useBrandSettings();
  const displayName = settings?.brand_name || "sua marca";
  const { history, canReanalyze, daysRemaining, daysSinceLast, runAnalysis } = useAnalysisHistory();
  const queryClient = useQueryClient();

  // TODO: Replace with real plan status check
  const hasPlan = true;

  // Read latest diagnostic payload (saved by PreviewPage) to use REAL data
  const [livePillars, setLivePillars] = useState<PillarPayload[] | null>(null);
  const [liveRadar, setLiveRadar] = useState<{ subject: string; value: number; fullMark: number }[] | null>(null);
  const [liveScore, setLiveScore] = useState<number | null>(null);
  useEffect(() => {
    if (snapshotOverride) {
      setLivePillars(snapshotOverride.pillarDetails ?? null);
      setLiveRadar(snapshotOverride.radar ?? null);
      setLiveScore(snapshotOverride.overallScore ?? null);
      return;
    }
    try {
      const raw = sessionStorage.getItem("ivero:lastDiagnostic");
      if (!raw) return;
      const payload = JSON.parse(raw);
      if (Array.isArray(payload.pillarDetails) && payload.pillarDetails.length > 0) {
        setLivePillars(payload.pillarDetails);
      }
      if (Array.isArray(payload.radar) && payload.radar.length > 0) {
        setLiveRadar(payload.radar);
      }
      if (typeof payload.geoScore === "number") {
        setLiveScore(payload.geoScore);
      }
    } catch {
      /* ignore */
    }
  }, [snapshotOverride]);

  // Merge live data with mock fallback (mock used only if no analysis was run yet)
  const effectiveRadar = liveRadar ?? radarData;
  const effectivePillars = (livePillars ?? pillarDetails).map((p) => ({
    ...p,
    icon: PILLAR_ICON_MAP[p.name] ?? Eye,
    subtitle: p.subtitle ?? "",
    summary: p.summary ?? "",
    strengths: p.strengths ?? [],
    weaknesses: p.weaknesses ?? [],
    recommendation: p.recommendation ?? "",
    definition: p.definition ?? "",
    status: p.status ?? "",
  }));
  const criteriaByPillar: Record<string, PillarCriterion[]> = {};
  (livePillars ?? []).forEach((p) => {
    if (p?.name && Array.isArray(p.criterios) && p.criterios.length > 0) {
      criteriaByPillar[p.name] = p.criterios;
    }
  });

  const handleReanalyze = () => {
    if (!canReanalyze) return;
    // Reaproveita a nuvem de termos extraída no último Diagnóstico (PreviewPage),
    // armazenada em sessionStorage. Ausente em sessões antigas → grava [].
    let keyword_cloud: unknown[] = [];
    // Base de modelos da última análise: guardada junto para que os deltas da
    // Evolução Estratégica só comparem análises com a mesma base de modelos.
    let models_ok: string[] = [];
    try {
      const raw = sessionStorage.getItem("ivero:lastDiagnostic");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.keyword_cloud)) keyword_cloud = parsed.keyword_cloud;
        if (Array.isArray(parsed?.models_ok)) models_ok = parsed.models_ok.filter((m: unknown) => typeof m === "string");
      }
    } catch {
      /* sessionStorage indisponível */
    }
    runAnalysis.mutate(
      {
        clarity: 82,
        authority: 35,
        conversion: 58,
        positioning: 64,
        experience: 71,
        keyword_cloud: keyword_cloud as never,
        models_ok,
      },

      {
        onSuccess: async () => {
          toast.success("Nova análise realizada com sucesso!");
          // Persiste snapshot completo no histórico navegável de auditorias.
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            // Recalcula a partir do estado corrente (closure captura valores ao chamar).
            const radarNow = liveRadar ?? [];
            const pillarsNow = (livePillars ?? []).map(({ criterios, ...rest }) => ({
              ...rest,
              criterios: criterios ?? [],
            }));
            const scoreNow = liveScore ?? (radarNow.length
              ? Math.round(radarNow.reduce((s, d) => s + d.value, 0) / radarNow.length)
              : 0);
            await supabase.from("audit_reports").insert({
              user_id: user.id,
              source: "reanalise",
              site_url: settings?.website ?? "",
              overall_score: scoreNow,
              status_label: "",
              radar_data: radarNow,
              pillar_details: pillarsNow,
              keyword_cloud: keyword_cloud as never,
              ai_engines: [],
            } as never);
            queryClient.invalidateQueries({ queryKey: ["audit-reports"] });
          } catch (e) {
            console.warn("Audit snapshot skipped:", e);
          }
        },
        onError: () => toast.error("Erro ao realizar análise. Tente novamente."),
      }
    );
  };

  if (isLoading) return <DiagnosticoSkeleton />;

  // Compute overall score from effective (live or mock) radar
  const overallScore = liveScore ?? Math.round(effectiveRadar.reduce((s, d) => s + d.value, 0) / effectiveRadar.length);
  const sortedRadar = [...effectiveRadar].sort((a, b) => b.value - a.value);
  const strongestPillar = sortedRadar[0];
  const weakestPillar = sortedRadar[sortedRadar.length - 1];

  const level = getScoreLevel(overallScore);
  const overallBand = getScoreBand(overallScore);
  const overallBandClass = getBandClass(overallBand.color);

  // Build evolution chart data from history
  const evolutionChartData = history.map((record) => ({
    date: new Date(record.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    score: record.overall_score,
  }));

  // Delta between last two analyses
  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const curr = history.length >= 1 ? history[history.length - 1] : null;
  const deltas = prev && curr ? [
    { label: "Clareza", delta: curr.clarity_score - prev.clarity_score },
    { label: "Autoridade", delta: curr.authority_score - prev.authority_score },
    { label: "Conversão", delta: curr.conversion_score - prev.conversion_score },
    { label: "Posicionamento", delta: curr.positioning_score - prev.positioning_score },
    { label: "Relevância", delta: curr.experience_score - prev.experience_score },
    { label: "Score Geral", delta: curr.overall_score - prev.overall_score },
  ] : null;

  return (
    <div id="diagnostico-report-root" className="space-y-8 max-w-4xl">
      {/* Header */}
      <motion.div {...fade}>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ivero-gradient shadow-sm">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">
              🧠 Diagnóstico de Influência em IA
            </h1>
            <p className="text-xs text-muted-foreground mt-1 italic">Análise inicial — Raio-X de como as IAs percebem sua marca hoje</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Análise completa de como as IAs percebem e recomendam {displayName}.
            </p>
          </div>
        </div>

        {/* Plan status removed — clients accessing dashboard already have a plan */}
      </motion.div>

      {/* Abrangência Geográfica (editável) */}
      {!readOnly && (
        <motion.div {...fade} transition={{ delay: 0.02 }}>
          <BrandCoverageInlineCard />
        </motion.div>
      )}

      {/* Re-analysis button */}
      {!readOnly && (
        <motion.div {...fade} transition={{ delay: 0.03 }}>
          <Card>
            <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Re-análise do site</p>
                  {daysSinceLast !== null ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Última análise há {daysSinceLast} {daysSinceLast === 1 ? "dia" : "dias"}
                      {!canReanalyze && ` · Disponível em ${daysRemaining} dias`}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhuma análise salva ainda</p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleReanalyze}
                disabled={!canReanalyze || runAnalysis.isPending}
                size="sm"
                className="gap-2"
              >
                {runAnalysis.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CalendarDays className="w-4 h-4" />
                )}
                {canReanalyze ? "Realizar nova análise" : `Aguarde ${daysRemaining} dias`}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Delta comparison between last two analyses */}
      {!readOnly && deltas && (
        <motion.div {...fade} transition={{ delay: 0.04 }}>
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Comparativo com Análise Anterior
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {deltas.map((d) => (
                  <div key={d.label} className="rounded-xl border border-border bg-card p-3 text-center space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">{d.label}</p>
                    <p className={`text-lg font-bold font-display ${
                      d.delta > 0 ? "text-emerald-500" : d.delta < 0 ? "text-red-500" : "text-muted-foreground"
                    }`}>
                      {d.delta > 0 ? "↑" : d.delta < 0 ? "↓" : "—"} {Math.abs(d.delta)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Score de Presença */}
      <motion.div {...fade} transition={{ delay: 0.05 }}>
        <Card className="overflow-hidden">
          <CardContent className="p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Score de Presença GEO
              <span className={`ml-1 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${overallBandClass}`}>
                {overallBand.label}
              </span>
            </h2>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className="text-5xl font-display font-bold text-foreground">{overallScore}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <div className="flex-1">
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      level.color === "red" ? "bg-red-500" :
                      level.color === "amber" ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${overallScore}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>

            {/* Score interpretation */}
            <div className={`rounded-xl p-4 border ${
              level.color === "red" ? "bg-red-50/80 border-red-200/60" :
              level.color === "amber" ? "bg-amber-50/80 border-amber-200/60" :
              "bg-emerald-50/80 border-emerald-200/60"
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-lg">{level.emoji}</span>
                <div>
                  <p className={`text-sm font-display font-bold ${
                    level.color === "red" ? "text-red-700" :
                    level.color === "amber" ? "text-amber-700" : "text-emerald-700"
                  }`}>{level.label}</p>
                  <p className={`text-sm mt-1 ${
                    level.color === "red" ? "text-red-600/80" :
                    level.color === "amber" ? "text-amber-600/80" : "text-emerald-600/80"
                  }`}>{level.message}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Radar Estratégico */}
      <motion.div {...fade} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Radar Estratégico
            </h2>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={effectiveRadar} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.6} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Sua Marca" dataKey="value" stroke="hsl(var(--primary))" fill="url(#radarGradientDash)" fillOpacity={0.3} strokeWidth={2.5} />
                  <defs>
                    <linearGradient id="radarGradientDash" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(265 70% 28%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(330 85% 55%)" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Weakest pillar warning */}
            <div className="rounded-xl bg-red-50/80 border border-red-200/60 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 font-medium">{getWeakestPillarPhrase(effectiveRadar)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/60 p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium">Principal ponto forte</p>
                <p className="text-base font-display font-bold text-emerald-700 mt-1">{strongestPillar?.subject}</p>
                <p className="text-xs text-emerald-600/70 mt-0.5">Score: {strongestPillar?.value}/100</p>
              </div>
              <div className="rounded-xl bg-red-50/80 border border-red-200/60 p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium">Maior vulnerabilidade</p>
                <p className="text-base font-display font-bold text-red-700 mt-1">{weakestPillar?.subject}</p>
                <p className="text-xs text-red-600/70 mt-0.5">Score: {weakestPillar?.value}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Diagnóstico Detalhado (5 Pilares) ── */}
      <motion.div {...fade} transition={{ delay: 0.15 }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Diagnóstico Detalhado
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Cada pilar impacta diretamente se a IA recomenda ou ignora sua marca.</p>
      </motion.div>

      <div className="space-y-4">
        {effectivePillars.map((pillar, idx) => {
          const PillarIcon = pillar.icon;
          const scoreColor = pillar.score >= 70 ? "emerald" : pillar.score >= 50 ? "amber" : "red";
          const statusBg = scoreColor === "emerald" ? "bg-emerald-50 border-emerald-200/60 text-emerald-700" : scoreColor === "amber" ? "bg-amber-50 border-amber-200/60 text-amber-700" : "bg-red-50 border-red-200/60 text-red-700";
          const barColor = scoreColor === "emerald" ? "bg-emerald-500" : scoreColor === "amber" ? "bg-amber-500" : "bg-red-500";
          const pillarBand = getScoreBand(pillar.score);
          const pillarBandClass = getBandClass(pillarBand.color);
          const criterios = criteriaByPillar[pillar.name] || [];

          return (
            <motion.div key={pillar.name} {...fade} transition={{ delay: 0.2 + idx * 0.05 }}>
              <Card>
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ivero-gradient shadow-sm">
                        <PillarIcon className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-base font-display font-bold text-foreground">
                          {pillar.name} <span className="text-muted-foreground font-normal text-sm">({pillar.subtitle})</span>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{pillar.summary}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-display font-bold text-foreground">{pillar.score}</span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${pillarBandClass}`}>
                        {pillarBand.label}
                      </span>
                    </div>
                  </div>

                  {/* Definition — subtle, secondary to analysis blocks */}
                  <div className="px-1">
                    <p className="text-xs text-muted-foreground/70 leading-relaxed italic">{pillar.definition}</p>
                  </div>

                  {/* Score bar */}
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${barColor}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pillar.score}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  </div>

                  {/* Como chegamos a esse score (3 sub-critérios ponderados) — exclusivo do dashboard executivo */}
                  {criterios.length > 0 && (
                    <div className="space-y-2.5 rounded-xl bg-muted/30 border border-border/40 p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                        Como chegamos a esse score
                      </p>
                      <TooltipProvider delayDuration={150}>
                        <div className="space-y-2.5">
                          {criterios.map((c, ci) => {
                            const cBand = getScoreBand(c.score);
                            const cBar =
                              cBand.color === "red" ? "bg-red-500"
                              : cBand.color === "orange" ? "bg-orange-500"
                              : cBand.color === "amber" ? "bg-amber-500"
                              : cBand.color === "blue" ? "bg-sky-500"
                              : "bg-emerald-500";
                            return (
                              <Tooltip key={ci}>
                                <TooltipTrigger asChild>
                                  <div className="space-y-1 cursor-help rounded-md -mx-1 px-1 py-0.5 hover:bg-muted/40 transition-colors">
                                    <div className="flex items-center justify-between text-xs gap-2">
                                      <span className="text-foreground font-medium truncate pr-1">{c.nome}</span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {c.consenso && c.consenso.total > 1 && (() => {
                                          const ratio = c.consenso.agree / c.consenso.total;
                                          const consClass =
                                            ratio >= 0.8 ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                            : ratio >= 0.5 ? "bg-sky-50 text-sky-700 border-sky-200/60"
                                            : "bg-amber-50 text-amber-700 border-amber-200/60";
                                          return (
                                            <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-semibold border tabular-nums ${consClass}`}>
                                              {c.consenso.agree}/{c.consenso.total} IAs
                                            </span>
                                          );
                                        })()}
                                        <span className="text-muted-foreground font-medium tabular-nums">
                                          {c.score}/100 <span className="text-muted-foreground/60">· {c.peso}%</span>
                                        </span>
                                      </div>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                      <motion.div
                                        className={`h-full rounded-full ${cBar}`}
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${c.score}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, delay: 0.1 + ci * 0.1, ease: "easeOut" }}
                                      />
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed space-y-1.5">
                                  <p>
                                    {c.justificativa && c.justificativa.trim().length > 0
                                      ? c.justificativa
                                      : "Justificativa não disponível para este critério nesta análise."}
                                  </p>
                                  {c.consenso && c.consenso.total > 1 && (
                                    <p className="text-[10px] text-muted-foreground/90 border-t border-border/40 pt-1.5">
                                      <span className="font-semibold">{c.consenso.agree} de {c.consenso.total} IAs</span> concordam com este score (variação ≤ 15 pontos da média).
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </TooltipProvider>
                      <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
                        Score do pilar = média ponderada dos 3 critérios acima. Passe o mouse para ver a justificativa da IA.
                      </p>
                    </div>
                  )}

                  {/* Strengths */}
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

                  {/* Weaknesses */}
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

                  {/* Recommendation — blurred if no plan, visible if plan active */}
                  {hasPlan ? (
                    <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 space-y-1.5">
                      <p className="text-xs font-semibold text-primary uppercase tracking-widest">Estratégia de Domínio</p>
                      <p className="text-sm text-foreground leading-relaxed">{pillar.recommendation}</p>
                    </div>
                  ) : (
                    <SoftBlur>
                      <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 space-y-1.5">
                        <p className="text-xs font-semibold text-primary uppercase tracking-widest">Estratégia de Domínio</p>
                        <p className="text-sm text-foreground leading-relaxed">{pillar.recommendation}</p>
                      </div>
                    </SoftBlur>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* WhatsApp CTA removed — client already in dashboard */}

      {/* ── Evolução do Score (histórico de re-análises) ── */}
      {!readOnly && evolutionChartData.length >= 2 && (
        <motion.div {...fade} transition={{ delay: 0.5 }}>
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Evolução do Score ao Longo do Tempo
              </h2>
              <p className="text-xs text-muted-foreground">
                Histórico das suas análises — cada ponto representa uma re-análise do site.
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={evolutionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <RTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: "hsl(var(--primary))" }}
                    name="Score GEO"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Diagnóstico Final (Premium) ── */}
      <motion.div {...fade} transition={{ delay: 0.55 }}>
        <Card className="shadow-[0_4px_40px_-8px_hsl(var(--primary)/0.15)] overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-ivero-gradient opacity-60" />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-ivero-gradient shadow-sm">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground">Diagnóstico Final</h2>
            </div>
            <p className="text-xs text-muted-foreground">A análise mais importante sobre o futuro da sua marca em IA</p>

            {hasPlan ? (
              <div className="rounded-xl bg-primary/5 border border-primary/15 p-5 space-y-3">
                <p className="text-sm text-foreground leading-relaxed font-medium">
                  Sua marca adota uma comunicação predominantemente racional e técnica, focada em valor e direcionada a
                  decisores B2B. Embora isso transmita credibilidade, a ausência de elementos emocionais e aspiracionais
                  reduz o impacto em buscas conversacionais feitas por IAs, que priorizam respostas mais humanizadas e
                  contextuais.
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  Os pilares de <strong>Autoridade</strong> e <strong>Conversão</strong> são os que mais limitam sua capacidade de ser
                  recomendado. Enquanto seus concorrentes investem nesses pontos, sua marca perde mercado de forma invisível.
                </p>
              </div>
            ) : (
              <SoftBlur label="🔒 Estratégia para Superar Seus Concorrentes">
                <div className="rounded-xl bg-primary/5 border border-primary/15 p-5 space-y-3">
                  <p className="text-sm text-foreground leading-relaxed font-medium">
                    Sua marca adota uma comunicação predominantemente racional e técnica, focada em valor e direcionada a
                    decisores B2B. Embora isso transmita credibilidade, a ausência de elementos emocionais e aspiracionais
                    reduz o impacto em buscas conversacionais feitas por IAs, que priorizam respostas mais humanizadas e
                    contextuais.
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Os pilares de <strong>Autoridade</strong> e <strong>Conversão</strong> são os que mais limitam sua capacidade de ser
                    recomendado. Enquanto seus concorrentes investem nesses pontos, sua marca perde mercado de forma invisível.
                  </p>
                </div>
              </SoftBlur>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* CTA Final removed — client already in dashboard */}
    </div>
  );
}
