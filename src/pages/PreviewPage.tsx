import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
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

/* ── Animated section wrapper ── */
function AnimatedSection({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Premium card wrapper ── */
function PremiumCard({ children, className = "", glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={`relative rounded-2xl border border-border/60 bg-card shadow-[0_2px_24px_-4px_hsl(var(--primary)/0.08)] overflow-hidden ${glow ? "shadow-[0_4px_40px_-8px_hsl(var(--primary)/0.15)]" : ""} ${className}`}>
      {/* Subtle gradient accent on top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-ivero-gradient opacity-60" />
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ── Section header with icon ── */
function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-ivero-gradient shadow-sm">
          <Icon className="w-4 h-4 text-primary-foreground" />
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      </div>
      {subtitle && <p className="text-xs text-muted-foreground ml-[42px]">{subtitle}</p>}
    </div>
  );
}

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
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-card/50 backdrop-blur-[4px]">
      <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-ivero-gradient shadow-lg">
        <Lock className="w-4 h-4 text-primary-foreground" />
        <span className="text-sm font-medium text-primary-foreground">Disponível em nossos planos</span>
      </div>
    </div>
  );
}

/* ── Loading Screen ── */
function LoadingScreen({ currentStep, progress }: { currentStep: number; progress: number }) {
  return (
    <div className="min-h-screen bg-ivero-dark flex items-center justify-center relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(265,70%,28%)] opacity-[0.06] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[hsl(330,85%,55%)] opacity-[0.04] blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md px-6 space-y-10 text-center relative z-10"
      >
        {/* Animated logo */}
        <div className="relative mx-auto w-32 h-32">
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, hsl(265 70% 28% / 0.6), hsl(330 85% 55% / 0.6), hsl(265 70% 28% / 0.1), hsl(265 70% 28% / 0.6))",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
          {/* Outer ring mask */}
          <div className="absolute inset-[3px] rounded-full bg-ivero-dark" />

          {/* Inner ring */}
          <motion.div
            className="absolute inset-4 rounded-full"
            style={{
              background: "conic-gradient(from 180deg, hsl(330 85% 55% / 0.5), hsl(265 70% 28% / 0.5), hsl(330 85% 55% / 0.1), hsl(330 85% 55% / 0.5))",
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-[19px] rounded-full bg-ivero-dark" />

          {/* Core glow */}
          <motion.div
            className="absolute inset-8 rounded-full bg-ivero-gradient"
            animate={{ scale: [0.85, 1, 0.85], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-base tracking-widest drop-shadow-lg">GEO</span>
          </div>
        </div>

        <div className="h-12 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3"
            >
              {(() => {
                const StepIcon = loadingSteps[currentStep]?.icon || Search;
                return <StepIcon className="w-5 h-5 text-ivero-pink shrink-0" />;
              })()}
              <span className="text-primary-foreground font-display text-lg font-medium">
                {loadingSteps[currentStep]?.text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-3">
          <div className="h-2 rounded-full bg-ivero-dark-surface overflow-hidden border border-ivero-purple/20">
            <motion.div
              className="h-full rounded-full bg-ivero-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <span className="text-sm text-ivero-slate-light font-display">{Math.round(progress)}%</span>
        </div>

        <div className="space-y-2.5">
          {loadingSteps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: i <= currentStep ? 1 : 0.3, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 text-sm"
            >
              {i < currentStep ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : i === currentStep ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Loader2 className="w-4 h-4 text-ivero-pink shrink-0" />
                </motion.div>
              ) : (
                <div className="w-4 h-4 rounded-full border border-ivero-slate/30 shrink-0" />
              )}
              <span className={i <= currentStep ? "text-primary-foreground" : "text-ivero-slate"}>
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
    <div className="flex flex-col sm:flex-row items-center gap-8">
      <div className="relative w-36 h-36 shrink-0">
        {/* Glow behind circle */}
        <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl" />
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90 relative z-10">
          <circle cx="60" cy="60" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <motion.circle
            cx="60" cy="60" r="45" fill="none"
            stroke={getScoreColor(animatedScore)}
            strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - animatedScore / 100) }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <span className="text-4xl font-display font-bold text-foreground">{animatedScore}</span>
          <span className="text-xs text-muted-foreground font-medium">/100</span>
        </div>
      </div>

      <div className="flex-1 space-y-4 text-center sm:text-left">
        <div>
          <p className="text-base font-display font-semibold text-foreground">Score de Presença GEO</p>
          <p className="text-xs text-muted-foreground mt-1">Índice de visibilidade da sua marca nas IAs generativas</p>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Sua marca</span>
              <span className="font-semibold text-foreground">{score}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: getScoreColor(score) }}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 2, ease: "easeOut" }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Média do setor</span>
              <span className="font-semibold text-foreground">{benchmark}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-muted-foreground/30"
                initial={{ width: 0 }}
                animate={{ width: `${benchmark}%` }}
                transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-xs font-medium text-destructive">
                {Math.abs(score - benchmark)} pontos abaixo da média
              </span>
            </div>
          </div>
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
      className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl print:hidden">
        <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-xl font-display font-bold text-gradient">
            Ivero
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-1.5 rounded-full border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all">
              <Download className="w-4 h-4" />
              Baixar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/preview")} className="rounded-full border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all">
              Nova Análise
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-3xl space-y-8">
        {/* Title */}
        <AnimatedSection>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs uppercase tracking-widest text-primary font-semibold">Diagnóstico Estratégico</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              {siteUrl || "Seu site"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Análise automatizada de presença e posicionamento em IAs generativas
            </p>
          </div>
        </AnimatedSection>

        {/* ── Score + AI Presence ── */}
        <AnimatedSection delay={0.1}>
          <PremiumCard glow>
            <div className="space-y-6">
              <ScoreCircle score={37} benchmark={58} />

              <div className="pt-5 border-t border-border/60 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Presença nas IAs</p>
                <div className="flex flex-wrap gap-2">
                  {aiEngines.map((engine) => (
                    <span
                      key={engine.name}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                        engine.found
                          ? "bg-primary/10 border border-primary/25 text-foreground shadow-sm"
                          : "bg-muted/60 border border-border/60 text-muted-foreground"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${engine.found ? "bg-emerald-500 shadow-[0_0_6px_hsl(142,71%,45%/0.5)]" : "bg-muted-foreground/30"}`} />
                      {engine.name}
                      {engine.found && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200/60 shadow-sm">
                    Sentimento Misto
                  </span>
                </div>
              </div>
            </div>
          </PremiumCard>
        </AnimatedSection>

        {/* ── Radar Estratégico ── */}
        <AnimatedSection delay={0.12}>
          <PremiumCard>
            <div className="space-y-5">
              <SectionHeader icon={Target} title="Radar Estratégico" subtitle="Visão macro dos 5 pilares de presença em IA" />

              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.6} />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }}
                    />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Sua Marca"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="url(#radarGradient)"
                      fillOpacity={0.3}
                      strokeWidth={2.5}
                    />
                    <defs>
                      <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="hsl(265 70% 28%)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(330 85% 55%)" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/60 p-4 text-center shadow-sm">
                  <p className="text-xs text-muted-foreground font-medium">Principal ponto forte</p>
                  <p className="text-base font-display font-bold text-emerald-700 mt-1">Clareza</p>
                  <p className="text-xs text-emerald-600/70 mt-0.5">Score: 82/100</p>
                </div>
                <div className="rounded-xl bg-amber-50/80 border border-amber-200/60 p-4 text-center shadow-sm">
                  <p className="text-xs text-muted-foreground font-medium">Maior ponto de melhoria</p>
                  <p className="text-base font-display font-bold text-amber-700 mt-1">Autoridade</p>
                  <p className="text-xs text-amber-600/70 mt-0.5">Score: 35/100</p>
                </div>
              </div>
            </div>
          </PremiumCard>
        </AnimatedSection>

        {/* ── Clareza da Proposta de Valor ── */}
        <AnimatedSection delay={0.15}>
          <PremiumCard>
            <div className="space-y-5">
              <SectionHeader icon={Eye} title="Clareza da Proposta de Valor" subtitle={`"Em 5 segundos eu entendo o que essa empresa faz?"`} />

              <div className="space-y-3">
                {clarezaItems.map((item, i) => {
                  const isBlurred = item.label === "Proposta única de valor" || item.label === "Benefício vs. Característica";
                  return (
                    <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                      isBlurred
                        ? "blur-[2px] select-none pointer-events-none bg-muted/30 border-border/40"
                        : item.status === "strong"
                          ? "bg-emerald-50/50 border-emerald-200/40"
                          : "bg-amber-50/50 border-amber-200/40"
                    }`}>
                      {item.status === "strong" ? (
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 shrink-0">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumo — soft blur */}
              <SoftBlur>
                <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 space-y-2">
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest">Resumo</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-emerald-600 font-semibold">2 pontos fortes</span>
                    <span className="text-amber-500 font-semibold">2 pontos de atenção</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sua comunicação de benefícios é eficaz, mas a diferenciação e proposta única precisam ser reforçadas
                    para que o visitante entenda instantaneamente por que escolher sua marca.
                  </p>
                </div>
              </SoftBlur>
            </div>
          </PremiumCard>
        </AnimatedSection>

        {/* ── Posicionamento Estratégico ── */}
        <AnimatedSection delay={0.2}>
          <PremiumCard>
            <div className="space-y-5">
              <SectionHeader icon={Target} title="Posicionamento Estratégico" />

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Linguagem", value: "Racional", sub: "vs emocional" },
                  { label: "Foco", value: "Valor", sub: "vs preço" },
                  { label: "Comunicação", value: "Técnica", sub: "vs aspiracional" },
                  { label: "Público implícito", value: "B2B", sub: "decisores" },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl bg-muted/40 border border-border/50 p-4 text-center hover:border-primary/20 hover:bg-primary/5 transition-all">
                    <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                    <p className="text-base font-display font-bold text-foreground mt-1">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                ))}
              </div>

              {/* Diagnóstico Final — soft blur */}
              <SoftBlur>
                <div className="rounded-xl bg-primary/5 border border-primary/15 p-4">
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Diagnóstico Final</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Sua marca adota uma comunicação predominantemente racional e técnica, focada em valor e direcionada a
                    decisores B2B. Embora isso transmita credibilidade, a ausência de elementos emocionais e aspiracionais
                    reduz o impacto em buscas conversacionais feitas por IAs, que priorizam respostas mais humanizadas e
                    contextuais.
                  </p>
                </div>
              </SoftBlur>
            </div>
          </PremiumCard>
        </AnimatedSection>

        {/* ── Diagnóstico Detalhado (BLURRED) ── */}
        <AnimatedSection delay={0.25}>
          <PremiumCard>
            <div className="space-y-4">
              <SectionHeader icon={AlertTriangle} title="Diagnóstico Detalhado" />
              <div className="relative">
                <BlurredOverlay />
                <div className="rounded-xl bg-muted/30 border border-border/40 p-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground">Principais Problemas Detectados:</p>
                  {["Baixa visibilidade em respostas do ChatGPT", "Marca não mencionada em comparativos do setor", "Conteúdo não otimizado para indexação por IA"].map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">•</span><span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PremiumCard>
        </AnimatedSection>

        {/* ── Plano de Ação (BLURRED) ── */}
        <AnimatedSection delay={0.3}>
          <PremiumCard>
            <div className="space-y-4">
              <SectionHeader icon={TrendingUp} title="Plano de Ação Recomendado" />
              <div className="relative">
                <BlurredOverlay />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {["Otimizar conteúdo para perguntas frequentes", "Criar páginas de comparação", "Backlinks autoritativos", "Monitorar menções"].map((a, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl bg-muted/30 border border-border/40 p-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-ivero-gradient text-primary-foreground text-xs font-bold shrink-0">{i + 1}</span>
                      <span className="text-sm text-muted-foreground">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PremiumCard>
        </AnimatedSection>

        {/* ── Previsão de Impacto (BLURRED) ── */}
        <AnimatedSection delay={0.35}>
          <PremiumCard>
            <div className="space-y-4">
              <SectionHeader icon={Rocket} title="Previsão de Impacto" />
              <div className="relative">
                <BlurredOverlay />
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { metric: "+180%", label: "Menções em IAs" },
                    { metric: "Top 3", label: "Posição no setor" },
                    { metric: "+65%", label: "Tráfego qualificado" },
                  ].map((item, i) => (
                    <div key={i} className="rounded-xl bg-muted/30 border border-border/40 p-4 text-center">
                      <p className="text-2xl font-display font-bold text-foreground">{item.metric}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PremiumCard>
        </AnimatedSection>

        {/* ── Ivero Features + CTA ── */}
        <AnimatedSection delay={0.38}>
          <PremiumCard glow>
            <div className="space-y-6">
              <SectionHeader icon={Sparkles} title="Sua marca merece ser lembrada" subtitle="Com a Ivero, você tem tudo para dominar a presença da sua marca nas IAs generativas" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {iveroFeatures.map((feat, i) => {
                  const Icon = feat.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-xl bg-muted/30 border border-border/50 p-4 hover:border-primary/25 hover:bg-primary/5 hover:shadow-sm transition-all group">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ivero-gradient shadow-sm group-hover:shadow-md transition-shadow shrink-0">
                        <Icon className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{feat.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{feat.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                variant="hero"
                size="lg"
                className="w-full text-base py-6 shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_30px_-4px_hsl(var(--primary)/0.5)] transition-shadow"
                onClick={() => navigate("/")}
              >
                Conheça nossos planos
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </PremiumCard>
        </AnimatedSection>

        {/* ── CTA de impacto ── */}
        <AnimatedSection delay={0.42}>
          <div className="relative rounded-2xl overflow-hidden">
            {/* Background with gradient */}
            <div className="absolute inset-0 bg-ivero-gradient" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(330,85%,55%/0.3),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(265,70%,40%/0.4),transparent_50%)]" />

            <div className="relative z-10 p-8 sm:p-10 text-center space-y-5">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-primary-foreground leading-snug">
                Enquanto você lê isso, a IA já decidiu quem indicar.
              </h2>
              <p className="text-sm text-primary-foreground/80 max-w-md mx-auto">
                Não deixe seus concorrentes dominarem as respostas. Comece agora.
              </p>
              <Button
                size="lg"
                className="bg-white text-foreground hover:bg-white/90 border-0 text-base py-6 px-8 rounded-full font-semibold shadow-[0_4px_20px_-4px_hsl(0,0%,100%/0.4)] hover:shadow-[0_6px_30px_-4px_hsl(0,0%,100%/0.5)] transition-all"
                onClick={() => navigate("/login")}
              >
                Começar agora — é rápido
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </AnimatedSection>
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
