import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Search, Globe, Brain, Bot, Zap, BarChart3,
  AlertTriangle, TrendingUp, CheckCircle2, Sparkles, Loader2,
  Lock, Target, Eye, Rocket, Download,
  Activity, ShieldCheck, LineChart, MessageSquare, Gauge, Radio,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from "recharts";

/* ── Loading steps ── */
const loadingSteps = [
  { icon: Search, text: "Analisando seu site..." },
  { icon: Globe, text: "Coletando dados estruturais..." },
  { icon: Brain, text: "Processando informações comportamentais..." },
  { icon: Bot, text: "Consultando modelos de IA..." },
  { icon: Zap, text: "Consolidando insights..." },
  { icon: BarChart3, text: "Gerando diagnóstico final..." },
];

/* ── Mock data ── */
const aiEngines = [
  { name: "ChatGPT", found: true },
  { name: "Claude", found: true },
  { name: "Gemini", found: false },
  { name: "Perplexity", found: false },
];

const clarezaItems = [
  { label: "Clareza da headline", status: "strong" as const, detail: "Sua headline comunica o core business de forma direta." },
  { label: "Diferenciação", status: "weak" as const, detail: "Não há um diferencial claro em relação à concorrência." },
  { label: "Proposta única de valor", status: "weak" as const, detail: "O visitante não entende por que escolher você em 5 segundos." },
  { label: "Benefício vs. Característica", status: "strong" as const, detail: "Boa ênfase nos resultados para o cliente." },
];

const radarData = [
  { subject: "Clareza", value: 82, fullMark: 100 },
  { subject: "Autoridade", value: 35, fullMark: 100 },
  { subject: "Conversão", value: 58, fullMark: 100 },
  { subject: "Posicionamento", value: 64, fullMark: 100 },
  { subject: "Experiência", value: 71, fullMark: 100 },
];

const iveroFeatures = [
  { icon: Activity, label: "Monitoramento Multi-IA", desc: "Presença em ChatGPT, Claude, Gemini e mais" },
  { icon: Gauge, label: "Score GEO em Tempo Real", desc: "Índice de visibilidade atualizado continuamente" },
  { icon: LineChart, label: "Análise Comparativa", desc: "Benchmark contra concorrentes do seu setor" },
  { icon: Radio, label: "Alertas Inteligentes", desc: "Notificações quando sua marca é mencionada" },
  { icon: ShieldCheck, label: "Proteção de Reputação", desc: "Monitoramento de sentimento e riscos" },
  { icon: MessageSquare, label: "Otimização de Prompts", desc: "Estratégias para dominar respostas de IA" },
];

/* ── Soft blur overlay (for Resumo / Diagnóstico Final) ── */
function SoftBlur({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="blur-[2px] select-none pointer-events-none">{children}</div>
    </div>
  );
}

/* ── Blurred overlay for locked sections ── */
function BlurredOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-background/40 backdrop-blur-[4px] border border-border">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Disponível em nossos planos</span>
      </div>
    </div>
  );
}

/* ── Loading Screen ── */
function LoadingScreen({ currentStep, progress }: { currentStep: number; progress: number }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md px-6 space-y-8 text-center"
      >
        <div className="relative mx-auto w-24 h-24">
          {/* Outer rotating ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "hsl(var(--primary))", borderRightColor: "hsl(var(--accent))" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          {/* Middle pulsing ring */}
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-transparent"
            style={{ borderBottomColor: "hsl(var(--accent))", borderLeftColor: "hsl(var(--primary))" }}
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          {/* Inner glow */}
          <motion.div
            className="absolute inset-4 rounded-full bg-ivero-gradient"
            animate={{ scale: [0.85, 1, 0.85], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Center logo text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-sm tracking-wider">GEO</span>
          </div>
        </div>

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
                return <StepIcon className="w-5 h-5 text-primary shrink-0" />;
              })()}
              <span className="text-foreground font-display text-lg font-medium">
                {loadingSteps[currentStep]?.text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-3">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-ivero-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>

        <div className="space-y-2">
          {loadingSteps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: i <= currentStep ? 1 : 0.3 }}
              className="flex items-center gap-2 text-sm"
            >
              {i < currentStep ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : i === currentStep ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-border shrink-0" />
              )}
              <span className={i <= currentStep ? "text-foreground" : "text-muted-foreground"}>
                {step.text}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Animated Score Circle ── */
function ScoreCircle({ score, benchmark }: { score: number; benchmark: number }) {
  const circumference = 2 * Math.PI * 45;
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let frame: number;
    const duration = 2000;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const getScoreColor = (val: number) => {
    if (val < 40) return "hsl(0, 72%, 51%)";
    if (val < 70) return "hsl(38, 92%, 50%)";
    return "hsl(142, 71%, 45%)";
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <motion.circle
            cx="60" cy="60" r="45" fill="none"
            stroke={getScoreColor(animatedScore)}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - animatedScore / 100) }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{animatedScore}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>

      <div className="flex-1 space-y-4 text-center sm:text-left">
        <div>
          <p className="text-sm font-medium text-foreground">Score de Presença GEO</p>
          <p className="text-xs text-muted-foreground mt-1">Índice de visibilidade da sua marca nas IAs generativas</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Sua marca</span>
            <span className="font-medium text-foreground">{score}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: getScoreColor(score) }}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Média do setor</span>
            <span className="font-medium text-foreground">{benchmark}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-muted-foreground/40"
              initial={{ width: 0 }}
              animate={{ width: `${benchmark}%` }}
              transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-destructive font-medium mt-1">
            ⚠ {Math.abs(score - benchmark)} pontos abaixo da média do setor
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Diagnostic Report ── */
function DiagnosticReport({ siteUrl }: { siteUrl: string }) {
  const navigate = useNavigate();

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md print:hidden">
        <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-xl font-display font-bold text-gradient">
            Ivero
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-1.5" />
              Baixar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/preview")}>
              Nova Análise
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-3xl space-y-8">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-primary font-medium">Diagnóstico Estratégico</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            {siteUrl || "Seu site"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Análise automatizada de presença e posicionamento em IAs generativas
          </p>
        </motion.div>

        {/* ── Score + AI Presence ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-5"
        >
          <ScoreCircle score={37} benchmark={58} />

          <div className="pt-4 border-t border-border space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Presença nas IAs</p>
            <div className="flex flex-wrap gap-2">
              {aiEngines.map((engine) => (
                <span
                  key={engine.name}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                    engine.found
                      ? "bg-primary/10 border-primary/30 text-foreground"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${engine.found ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                  {engine.name}
                  {engine.found && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium border border-amber-200">
                Sentimento Misto
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Radar Estratégico ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">Radar Estratégico</h2>
          </div>
          <p className="text-xs text-muted-foreground">Visão macro dos 5 pilares de presença em IA</p>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Sua Marca"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
              <p className="text-xs text-muted-foreground">Principal ponto forte</p>
              <p className="text-sm font-bold text-emerald-700 mt-1">Clareza</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
              <p className="text-xs text-muted-foreground">Maior ponto de melhoria</p>
              <p className="text-sm font-bold text-amber-700 mt-1">Autoridade</p>
            </div>
          </div>
        </motion.div>

        {/* ── Clareza da Proposta de Valor ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">Clareza da Proposta de Valor</h2>
          </div>
          <p className="text-xs text-muted-foreground italic">
            "Em 5 segundos eu entendo o que essa empresa faz?"
          </p>

          <div className="space-y-3">
          {clarezaItems.map((item, i) => {
              const isBlurred = item.label === "Proposta única de valor" || item.label === "Benefício vs. Característica";
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border ${isBlurred ? "blur-[2px] select-none pointer-events-none" : ""}`}>
                  {item.status === "strong" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumo — soft blur */}
          <SoftBlur>
            <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2">
              <p className="text-xs font-medium text-foreground uppercase tracking-wide">Resumo</p>
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-600 font-medium">2 pontos fortes</span>
                <span className="text-amber-500 font-medium">2 pontos de atenção</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sua comunicação de benefícios é eficaz, mas a diferenciação e proposta única precisam ser reforçadas
                para que o visitante entenda instantaneamente por que escolher sua marca.
              </p>
            </div>
          </SoftBlur>
        </motion.div>

        {/* ── Posicionamento Estratégico ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">Posicionamento Estratégico</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Linguagem", value: "Racional", sub: "vs emocional" },
              { label: "Foco", value: "Valor", sub: "vs preço" },
              { label: "Comunicação", value: "Técnica", sub: "vs aspiracional" },
              { label: "Público implícito", value: "B2B", sub: "decisores" },
            ].map((item, i) => (
              <div key={i} className="rounded-xl bg-muted/50 border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-bold text-foreground mt-1">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Diagnóstico Final — soft blur */}
          <SoftBlur>
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
              <p className="text-xs font-medium text-primary uppercase tracking-wide mb-2">Diagnóstico Final</p>
              <p className="text-sm text-foreground leading-relaxed">
                Sua marca adota uma comunicação predominantemente racional e técnica, focada em valor e direcionada a
                decisores B2B. Embora isso transmita credibilidade, a ausência de elementos emocionais e aspiracionais
                reduz o impacto em buscas conversacionais feitas por IAs, que priorizam respostas mais humanizadas e
                contextuais.
              </p>
            </div>
          </SoftBlur>
        </motion.div>

        {/* ── Diagnóstico Detalhado (BLURRED — lighter) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="relative"
        >
          <BlurredOverlay />
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-display text-base font-bold text-foreground">Diagnóstico Detalhado</h2>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border p-3 space-y-1.5">
              <p className="text-sm font-medium text-foreground">Principais Problemas Detectados:</p>
              {["Baixa visibilidade em respostas do ChatGPT", "Marca não mencionada em comparativos do setor", "Conteúdo não otimizado para indexação por IA"].map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span><span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Plano de Ação (BLURRED — lighter) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="relative"
        >
          <BlurredOverlay />
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-display text-base font-bold text-foreground">Plano de Ação Recomendado</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {["Otimizar conteúdo para perguntas frequentes", "Criar páginas de comparação", "Backlinks autoritativos", "Monitorar menções"].map((a, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl bg-muted/50 border border-border p-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-ivero-gradient text-primary-foreground text-xs font-bold shrink-0">{i + 1}</span>
                  <span className="text-sm text-muted-foreground">{a}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Previsão de Impacto (BLURRED — lighter) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="relative"
        >
          <BlurredOverlay />
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              <h2 className="font-display text-base font-bold text-foreground">🔮 Previsão de Impacto</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { metric: "+180%", label: "Menções em IAs" },
                { metric: "Top 3", label: "Posição no setor" },
                { metric: "+65%", label: "Tráfego qualificado" },
              ].map((item, i) => (
                <div key={i} className="rounded-xl bg-muted/50 border border-border p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{item.metric}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Ivero Features + CTA "Conheça nossos planos" ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-5"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">Sua marca merece ser lembrada</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Com a Ivero, você tem tudo para dominar a presença da sua marca nas IAs generativas:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {iveroFeatures.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div key={i} className="flex items-start gap-3 rounded-xl bg-muted/50 border border-border p-4">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{feat.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            variant="hero"
            size="lg"
            className="w-full text-base py-6"
            onClick={() => navigate("/")}
          >
            Conheça nossos planos
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>

        {/* ── CTA de impacto separado ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
          className="rounded-2xl border border-primary/30 bg-ivero-gradient p-6 text-center space-y-4"
        >
          <h2 className="font-display text-xl font-bold text-primary-foreground">
            Enquanto você lê isso, a IA já decidiu quem indicar.
          </h2>
          <p className="text-sm text-primary-foreground/80">
            Não deixe seus concorrentes dominarem as respostas. Comece agora.
          </p>
          <Button
            variant="outline"
            size="lg"
            className="bg-white text-foreground hover:bg-white/90 border-white/20 text-base py-6 px-8"
            onClick={() => navigate("/login")}
          >
            Começar agora — é rápido
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
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
    const totalDuration = 7000;
    const stepDuration = totalDuration / loadingSteps.length;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 100 / (totalDuration / 50);
      });
    }, 50);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev >= loadingSteps.length - 1 ? prev : prev + 1));
    }, stepDuration);

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

  if (loading) return <LoadingScreen currentStep={currentStep} progress={progress} />;
  return <DiagnosticReport siteUrl={siteUrl} />;
}
