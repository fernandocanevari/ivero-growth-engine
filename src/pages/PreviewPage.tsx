import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Search, Globe, Brain, Bot, Zap, BarChart3,
  AlertTriangle, TrendingUp, CheckCircle2, Sparkles, Loader2,
  ChevronRight,
} from "lucide-react";

/* ── Loading steps ── */
const loadingSteps = [
  { icon: Search, text: "Analisando seu site..." },
  { icon: Globe, text: "Coletando dados estruturais..." },
  { icon: Brain, text: "Processando informações comportamentais..." },
  { icon: Bot, text: "Consultando modelos de IA..." },
  { icon: Zap, text: "Consolidando insights..." },
  { icon: BarChart3, text: "Gerando diagnóstico final..." },
];

/* ── Mock diagnostic data ── */
const aiEngines = [
  { name: "ChatGPT", found: true },
  { name: "Claude", found: true },
  { name: "Gemini", found: false },
  { name: "Perplexity", found: false },
];

const problems = [
  "Baixa visibilidade em respostas do ChatGPT",
  "Marca não mencionada em comparativos do setor",
  "Conteúdo não otimizado para indexação por IA",
];

const actionPlan = [
  "Otimizar conteúdo para perguntas frequentes do setor",
  "Criar páginas de comparação com concorrentes",
  "Desenvolver estratégia de backlinks autoritativos",
  "Monitorar menções em tempo real nas principais IAs",
];

const nextSteps = [
  "Análise completa de 15+ prompts estratégicos",
  "Mapeamento de concorrentes nas IAs",
  "Relatório detalhado de oportunidades GEO",
  "Plano de ação personalizado para sua marca",
];

/* ── Loading Screen ── */
function LoadingScreen({ currentStep, progress }: { currentStep: number; progress: number }) {
  return (
    <div className="min-h-screen bg-ivero-dark flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md px-6 space-y-8 text-center"
      >
        {/* Spinning icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-ivero-gradient opacity-20 animate-pulse-glow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
          </div>
        </div>

        {/* Current step text */}
        <div className="h-12 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3"
            >
              {(() => {
                const StepIcon = loadingSteps[currentStep]?.icon || Search;
                return <StepIcon className="w-5 h-5 text-accent shrink-0" />;
              })()}
              <span className="text-primary-foreground font-display text-lg font-medium">
                {loadingSteps[currentStep]?.text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="space-y-3">
          <div className="h-2 rounded-full bg-ivero-dark-surface overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-ivero-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>

        {/* Completed steps */}
        <div className="space-y-2">
          {loadingSteps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: i <= currentStep ? 1 : 0.3 }}
              className="flex items-center gap-2 text-sm"
            >
              {i < currentStep ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : i === currentStep ? (
                <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-muted-foreground/30 shrink-0" />
              )}
              <span className={i <= currentStep ? "text-primary-foreground" : "text-muted-foreground"}>
                {step.text}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Diagnostic Report ── */
function DiagnosticReport({ siteUrl }: { siteUrl: string }) {
  const navigate = useNavigate();
  const score = 37;
  const circumference = 2 * Math.PI * 45;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-ivero-dark"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-ivero-dark/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-xl font-display font-bold text-gradient">
            Ivero
          </button>
          <Button variant="outline" size="sm" className="border-border text-primary-foreground hover:bg-ivero-dark-surface"
            onClick={() => navigate("/preview")}>
            Nova Análise
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-3xl space-y-8">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
          <p className="text-sm text-muted-foreground">Análise prévia para</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary-foreground">
            {siteUrl || "Seu site"}
          </h1>
          {siteUrl && <p className="text-sm text-muted-foreground">{siteUrl}</p>}
        </motion.div>

        {/* Score + AI Presence */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-ivero-dark-surface p-6"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Score gauge */}
            <div className="relative w-28 h-28 shrink-0">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle cx="60" cy="60" r="45" fill="none" stroke="url(#scoreGrad)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" />
                    <stop offset="50%" stopColor="hsl(var(--accent))" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-primary-foreground">{score}%</span>
              </div>
            </div>

            <div className="flex-1 space-y-3 text-center sm:text-left">
              <p className="text-sm text-muted-foreground">Score de Presença</p>
              {/* AI Engine badges */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Presença nas IAs:</p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {aiEngines.map((engine) => (
                    <span
                      key={engine.name}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                        engine.found
                          ? "bg-primary/20 border-primary text-primary-foreground"
                          : "bg-ivero-dark-surface border-border text-muted-foreground"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${engine.found ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      {engine.name}
                      {engine.found && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sentiment */}
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/30">
                  Misto
                </span>
                <span className="text-xs text-muted-foreground">Sentimento Geral</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Diagnóstico */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-ivero-dark-surface p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-lg font-bold text-primary-foreground">Diagnóstico</h2>
          </div>
          <div className="rounded-xl bg-ivero-dark border border-border p-4 space-y-2">
            <p className="text-sm font-medium text-primary-foreground">Principais Problemas Detectados:</p>
            {problems.map((problem, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-accent mt-0.5">•</span>
                <span>{problem}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Plano de Ação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border bg-ivero-dark-surface p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="font-display text-lg font-bold text-primary-foreground">Plano de Ação Recomendado</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actionPlan.map((action, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl bg-ivero-dark border border-border p-4">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-ivero-gradient text-primary-foreground text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground">{action}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Próximos Passos + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-accent/30 bg-ivero-dark-surface p-6 space-y-5"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="font-display text-lg font-bold text-primary-foreground">Próximos Passos com a IVERO</h2>
          </div>
          <div className="space-y-2">
            {nextSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <ChevronRight className="w-4 h-4 text-accent shrink-0" />
                <span>{step}</span>
              </div>
            ))}
          </div>
          <div className="pt-2">
            <Button variant="hero" size="lg" className="w-full text-base py-6" onClick={() => navigate("/login")}>
              Desbloquear análise completa — é grátis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ── Main Page ── */
export default function PreviewPage() {
  const [searchParams] = useSearchParams();
  const siteUrl = searchParams.get("url") || "";
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = 7000; // 7 seconds
    const stepDuration = totalDuration / loadingSteps.length;

    // Progress timer
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 100 / (totalDuration / 50);
      });
    }, 50);

    // Step timer
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= loadingSteps.length - 1) return prev;
        return prev + 1;
      });
    }, stepDuration);

    // Done
    const timeout = setTimeout(() => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      setProgress(100);
      setCurrentStep(loadingSteps.length - 1);
      setTimeout(() => setLoading(false), 500);
    }, totalDuration);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return <LoadingScreen currentStep={currentStep} progress={progress} />;
  }

  return <DiagnosticReport siteUrl={siteUrl} />;
}
