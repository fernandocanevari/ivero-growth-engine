import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Sparkles, Target, TrendingUp, AlertCircle, CheckCircle2, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface HaikuOutput {
  authority_score: number;
  clarity_score: number;
  conversion_score: number;
  positioning_score: number;
  semantic_thread_score: number;
  overall_score: number;
  detected_entities: string[];
  content_gaps: string[];
  raw_brand_data: Record<string, unknown>;
}

interface PillarAnalysis {
  score: number;
  insight: string;
  recommendation: string;
}

interface SonnetOutput {
  executive_summary: string;
  pillar_analysis: {
    authority: PillarAnalysis;
    clarity: PillarAnalysis;
    conversion: PillarAnalysis;
    positioning: PillarAnalysis;
    semantic_thread: PillarAnalysis;
  };
  top_priorities: string[];
  roadmap: { phase: string; actions: string[] }[];
}

interface AnalysisResult {
  haiku: HaikuOutput;
  sonnet: SonnetOutput;
}

const PILLAR_LABELS: Record<keyof SonnetOutput["pillar_analysis"], string> = {
  authority: "Autoridade",
  clarity: "Clareza",
  conversion: "Conversão AI-first",
  positioning: "Posicionamento",
  semantic_thread: "Fio Semântico",
};

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-56 h-56 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
        <motion.circle
          cx="100" cy="100" r={radius} fill="none"
          stroke="url(#gauge-gradient)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="gauge-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(280 90% 60%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className={`text-6xl font-bold font-display ${scoreColor(score)}`}
        >
          {score}
        </motion.div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">AI Presence</p>
      </div>
    </div>
  );
}

export default function IveroAnalysisPage() {
  const [url, setUrl] = useState("");
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "haiku" | "sonnet">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast({ title: "URL obrigatória", description: "Informe a URL da marca para analisar." });
      return;
    }
    setLoading(true);
    setResult(null);
    setStage("haiku");

    // Faseamento visual: dispara mudança para "sonnet" ~5s depois (a função é sequencial no backend)
    const sonnetTimer = setTimeout(() => setStage("sonnet"), 5000);

    try {
      const { data, error } = await supabase.functions.invoke("ivero-analyze", {
        body: { brand_url: url.trim(), brand_name: brandName.trim() || undefined },
      });
      clearTimeout(sonnetTimer);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as AnalysisResult);
      toast({ title: "Análise concluída", description: "Seu relatório estratégico Ivero está pronto." });
    } catch (err) {
      clearTimeout(sonnetTimer);
      const msg = err instanceof Error ? err.message : "Falha desconhecida";
      toast({ title: "Erro na análise", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
      setStage("idle");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Ivero · Análise GEO</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight">
            Quão visível sua marca é para as IAs?
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Pipeline duplo Claude Haiku + Sonnet. Extração de entidades, scoring por pilar e relatório estratégico em uma rodada.
          </p>
        </motion.div>

        {/* Form */}
        <Card className="mb-10 border-primary/20">
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-[1fr_220px_140px] gap-3">
              <Input
                placeholder="https://suamarca.com.br"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
              <Input
                placeholder="Nome da marca (opcional)"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                disabled={loading}
              />
              <Button onClick={handleAnalyze} disabled={loading} className="bg-primary hover:bg-primary/90">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Analisar <ArrowRight className="h-4 w-4 ml-1" /></>}
              </Button>
            </div>

            {loading && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {stage === "haiku" ? (
                    <><Zap className="h-4 w-4 text-primary animate-pulse" /> <span>Haiku 4.5 · Extraindo entidades e calculando scores por pilar...</span></>
                  ) : (
                    <><Brain className="h-4 w-4 text-primary animate-pulse" /> <span>Sonnet 4.5 · Gerando relatório estratégico e roadmap...</span></>
                  )}
                </div>
                <Progress value={stage === "haiku" ? 35 : 80} className="h-1.5" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
            {/* Gauge + Pillars */}
            <section className="grid md:grid-cols-[auto_1fr] gap-8 items-center">
              <div className="flex justify-center"><ScoreGauge score={result.haiku.overall_score} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(PILLAR_LABELS) as (keyof typeof PILLAR_LABELS)[]).map((key) => {
                  const score = result.sonnet.pillar_analysis[key].score;
                  return (
                    <Card key={key} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{PILLAR_LABELS[key]}</span>
                          <span className={`text-2xl font-bold font-display ${scoreColor(score)}`}>{score}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${scoreBg(score)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${score}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            <p className="text-xs text-muted-foreground text-center max-w-3xl mx-auto -mt-4">
              Auditoria baseada em sinais públicos inferidos. Os scores refletem a probabilidade de presença da marca em respostas de IAs com base em dados públicos disponíveis, sem acesso direto ao site.
            </p>

            {/* Executive summary */}
            <section>
              <h2 className="text-2xl font-display font-semibold mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" /> Resumo Executivo
              </h2>
              <Card>
                <CardContent className="p-6 whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {result.sonnet.executive_summary}
                </CardContent>
              </Card>
            </section>

            {/* Per-pillar insights */}
            <section>
              <h2 className="text-2xl font-display font-semibold mb-3">Análise por Pilar</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {(Object.keys(PILLAR_LABELS) as (keyof typeof PILLAR_LABELS)[]).map((key) => {
                  const p = result.sonnet.pillar_analysis[key];
                  return (
                    <Card key={key}>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{PILLAR_LABELS[key]}</h3>
                          <Badge variant="outline" className={scoreColor(p.score)}>{p.score}/100</Badge>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Insight</p>
                          <p className="text-sm">{p.insight}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Recomendação</p>
                          <p className="text-sm text-foreground/90">{p.recommendation}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Top priorities */}
            <section>
              <h2 className="text-2xl font-display font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Prioridades de Maior Impacto
              </h2>
              <Card>
                <CardContent className="p-6">
                  <ol className="space-y-3">
                    {result.sonnet.top_priorities.map((p, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center">{i + 1}</span>
                        <span className="text-sm pt-1">{p}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </section>

            {/* Roadmap */}
            <section>
              <h2 className="text-2xl font-display font-semibold mb-3">Roadmap</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {result.sonnet.roadmap.map((r, i) => (
                  <Card key={i} className="border-primary/20">
                    <CardContent className="p-5">
                      <Badge className="mb-3 bg-primary/10 text-primary hover:bg-primary/10">{r.phase}</Badge>
                      <ul className="space-y-2">
                        {r.actions.map((a, j) => (
                          <li key={j} className="flex gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Entities & gaps */}
            <section className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-3">Entidades Detectadas</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.haiku.detected_entities.map((e, i) => (
                      <Badge key={i} variant="secondary">{e}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" /> Lacunas de Conteúdo
                  </h3>
                  <ul className="space-y-2">
                    {result.haiku.content_gaps.map((g, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {g}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          </motion.div>
        )}
      </div>
    </div>
  );
}
