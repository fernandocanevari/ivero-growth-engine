import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowRight, Search, Globe, Brain, Bot, Zap, BarChart3,
  AlertTriangle, TrendingUp, CheckCircle2, Sparkles, Loader2,
  Lock, Target, Eye, Rocket, Download, Mail,
  Activity, ShieldCheck, LineChart, MessageSquare, Gauge, Radio,
  Phone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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

const radarData = [
  { subject: "Clareza", value: 82, fullMark: 100 },
  { subject: "Autoridade", value: 35, fullMark: 100 },
  { subject: "Conversão", value: 58, fullMark: 100 },
  { subject: "Posicionamento", value: 64, fullMark: 100 },
  { subject: "Experiência", value: 71, fullMark: 100 },
];

const pillarDetails = [
  {
    name: "Clareza",
    score: 82,
    icon: Eye,
    color: "emerald",
    status: "Forte" as const,
    summary: "Sua marca comunica de forma direta o que faz e para quem.",
    strengths: [
      "Headline objetiva → IA compreende o core business rapidamente",
      "Benefícios claros → Aumenta chances de recomendação contextual",
    ],
    recommendation: "Reforce a proposta única de valor e a diferenciação competitiva para maximizar o impacto em respostas de IA.",
  },
  {
    name: "Autoridade",
    score: 35,
    icon: ShieldCheck,
    color: "red",
    status: "Crítico" as const,
    summary: "Autoridade baixa reduz drasticamente a chance de recomendação nas IAs.",
    strengths: [
      "Domínio registrado → Base mínima de presença online identificada",
    ],
    weaknesses: [
      "Ausência de backlinks de qualidade → IA não reconhece referências externas",
      "Sem menções em mídia especializada → Reduz credibilidade algorítmica",
      "Conteúdo técnico insuficiente → Limita profundidade de indexação por IA",
    ],
    recommendation: "Invista em backlinks de alta qualidade, menções em mídia especializada e conteúdo técnico aprofundado para construir autoridade.",
  },
  {
    name: "Conversão",
    score: 58,
    icon: Target,
    color: "amber",
    status: "Moderado" as const,
    summary: "CTAs presentes mas sem otimização para jornadas vindas de IA.",
    strengths: [
      "CTAs visíveis → Caminho de conversão existente",
      "Formulário acessível → Ponto de contato disponível",
    ],
    weaknesses: [
      "Sem landing pages para tráfego de IA → Perde visitantes que chegam via respostas",
      "Ausência de prova social contextual → Reduz taxa de conversão em 40%",
    ],
    recommendation: "Crie landing pages específicas para visitantes vindos de respostas de IA, com contexto personalizado e prova social.",
  },
  {
    name: "Posicionamento",
    score: 64,
    icon: Rocket,
    color: "amber",
    status: "Moderado" as const,
    summary: "Posicionamento técnico sólido, mas falta diferenciação emocional que IAs valorizam.",
    strengths: [
      "Linguagem profissional → Consistência na comunicação",
      "Foco em valor → Diferenciação por benefício detectada",
    ],
    weaknesses: [
      "Sem storytelling → IA gera respostas genéricas sobre sua marca",
      "Elementos aspiracionais ausentes → Reduz engajamento nas recomendações",
    ],
    recommendation: "Adicione elementos aspiracionais e storytelling à comunicação para que IAs gerem respostas mais humanizadas sobre sua marca.",
  },
  {
    name: "Experiência",
    score: 71,
    icon: Sparkles,
    color: "emerald",
    status: "Bom" as const,
    summary: "Estrutura técnica funcional com oportunidades de otimização para crawlers de IA.",
    strengths: [
      "Navegação intuitiva → Facilita compreensão da estrutura pela IA",
      "Design consistente → Sinal de profissionalismo para algoritmos",
    ],
    weaknesses: [
      "Dados estruturados ausentes → IA não consegue extrair informações semânticas",
      "Velocidade de carregamento → Impacta indexação por motores de IA",
    ],
    recommendation: "Otimize a velocidade de carregamento e implemente dados estruturados para facilitar a indexação por motores de IA.",
  },
];

/* ── Dynamic phrase for weakest pillar ── */
function getWeakestPillarPhrase(): string {
  const weakest = [...radarData].sort((a, b) => a.value - b.value)[0];
  const phrases: Record<string, string> = {
    Clareza: "Falta de clareza diminui a compreensão da IA sobre sua proposta de valor.",
    Autoridade: "Autoridade baixa reduz drasticamente a chance de recomendação nas IAs.",
    Conversão: "Baixa conversão significa que visitantes vindos de IA não se tornam clientes.",
    Posicionamento: "Posicionamento fraco faz a IA recomendar concorrentes no seu lugar.",
    Experiência: "Problemas estruturais limitam a capacidade da IA interpretar sua relevância.",
  };
  return phrases[weakest.subject] || phrases["Autoridade"];
}

/* ── Score level helper ── */
function getScoreLevel(score: number) {
  if (score <= 40) return { label: "Invisível", color: "red", emoji: "🔴", message: "Sua marca está sendo pouco recomendada nas IAs da sua categoria." };
  if (score <= 70) return { label: "Competindo", color: "amber", emoji: "🟡", message: "Você está abaixo do nível competitivo ideal para recomendação em IA." };
  return { label: "Influenciando", color: "emerald", emoji: "🟢", message: "Sua marca já tem forte presença nas IAs — agora é hora de consolidar liderança." };
}

const iveroFeatures = [
  { icon: Activity, label: "Monitoramento Multi-IA", desc: "Presença em ChatGPT, Claude, Gemini e mais" },
  { icon: Gauge, label: "Score GEO em Tempo Real", desc: "Índice de visibilidade atualizado continuamente" },
  { icon: LineChart, label: "Análise Comparativa", desc: "Benchmark contra concorrentes do seu setor" },
  { icon: Radio, label: "Alertas Inteligentes", desc: "Notificações quando sua marca é mencionada" },
  { icon: ShieldCheck, label: "Proteção de Reputação", desc: "Monitoramento de sentimento e riscos" },
  { icon: MessageSquare, label: "Otimização de Prompts", desc: "Estratégias para dominar respostas de IA" },
];

/* ── Soft blur overlay with lead form ── */
function SoftBlur({ children, label, onUnlock, unlocked = false }: { children: React.ReactNode; label?: string; onUnlock?: () => void; unlocked?: boolean }) {
  if (unlocked) return <>{children}</>;
  return (
    <div className="relative group/soft cursor-default" onClick={onUnlock}>
      <div className="blur-[1.5px] opacity-60 select-none pointer-events-none transition-all duration-500 group-hover/soft:blur-[3px] group-hover/soft:opacity-40">{children}</div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card/80 rounded-xl transition-opacity duration-500 group-hover/soft:to-card/90" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/soft:opacity-100 transition-all duration-400 z-10">
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-ivero-gradient shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.45)] scale-90 group-hover/soft:scale-100 transition-transform duration-400 cursor-pointer">
          <Lock className="w-3.5 h-3.5 text-primary-foreground" />
          <span className="text-sm font-medium text-primary-foreground">{label || "Ver recomendações completas"}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Blurred overlay for locked sections ── */
function BlurredOverlay({ title, onUnlock }: { title?: string; onUnlock?: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl group/locked cursor-pointer" onClick={onUnlock}>
      <div className="absolute inset-0 backdrop-blur-[3px] bg-gradient-to-b from-card/30 via-card/50 to-card/70 rounded-xl transition-all duration-500 group-hover/locked:backdrop-blur-[6px] group-hover/locked:from-card/40 group-hover/locked:via-card/60 group-hover/locked:to-card/80" />
      <div className="relative z-20 flex items-center gap-2 px-5 py-2.5 rounded-full bg-ivero-gradient shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.35)] transition-all duration-400 group-hover/locked:scale-110 group-hover/locked:shadow-[0_6px_30px_-4px_hsl(var(--primary)/0.5)]">
        <Lock className="w-3.5 h-3.5 text-primary-foreground transition-transform duration-400 group-hover/locked:rotate-[-12deg]" />
        <span className="text-sm font-medium text-primary-foreground">{title || "Ver recomendações completas"}</span>
      </div>
    </div>
  );
}

/* ── Loading Screen ── */
function LoadingScreen({ currentStep, progress }: { currentStep: number; progress: number }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(265,70%,28%)] opacity-[0.04] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[hsl(330,85%,55%)] opacity-[0.03] blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md px-6 space-y-10 text-center relative z-10"
      >
        {/* Animated logo */}
        <div className="relative mx-auto w-32 h-32">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: "conic-gradient(from 0deg, hsl(265 70% 28% / 0.6), hsl(330 85% 55% / 0.6), hsl(265 70% 28% / 0.1), hsl(265 70% 28% / 0.6))" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-[3px] rounded-full bg-background" />
          <motion.div
            className="absolute inset-4 rounded-full"
            style={{ background: "conic-gradient(from 180deg, hsl(330 85% 55% / 0.5), hsl(265 70% 28% / 0.5), hsl(330 85% 55% / 0.1), hsl(330 85% 55% / 0.5))" }}
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-[19px] rounded-full bg-background" />
          <motion.div
            className="absolute inset-8 rounded-full bg-ivero-gradient"
            animate={{ scale: [0.85, 1, 0.85], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-base tracking-widest">GEO</span>
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
              <span className="text-foreground font-display text-lg font-medium">
                {loadingSteps[currentStep]?.text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-3">
          <div className="h-2 rounded-full bg-muted overflow-hidden border border-primary/20">
            <motion.div
              className="h-full rounded-full bg-ivero-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <span className="text-sm text-muted-foreground font-display">{Math.round(progress)}%</span>
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
              <span className={i <= currentStep ? "text-foreground" : "text-muted-foreground/50"}>
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
  const level = getScoreLevel(score);

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
    if (val <= 40) return "hsl(0, 72%, 51%)";
    if (val <= 70) return "hsl(38, 92%, 50%)";
    return "hsl(142, 71%, 45%)";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center gap-8">
        <div className="relative w-36 h-36 shrink-0">
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
            <span className="text-3xl font-display font-bold text-foreground">{animatedScore}</span>
            <span className="text-xs text-muted-foreground font-medium mt-0.5">/100</span>
          </div>
        </div>

        <div className="flex-1 space-y-4 text-center sm:text-left">
          <div>
            <p className="text-base font-display font-semibold text-foreground">Score de Presença GEO</p>
            <p className="text-xs text-muted-foreground mt-1">Índice de influência da sua marca nas IAs generativas</p>
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
          </div>
        </div>
      </div>

      {/* Score level interpretation — always show consequence */}
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
              level.color === "amber" ? "text-amber-700" :
              "text-emerald-700"
            }`}>
              {level.label}
            </p>
            <p className={`text-sm mt-1 leading-relaxed ${
              level.color === "red" ? "text-red-600/80" :
              level.color === "amber" ? "text-amber-600/80" :
              "text-emerald-600/80"
            }`}>
              {level.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Diagnostic Report ── */
function DiagnosticReport({ siteUrl }: { siteUrl: string }) {
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const handleLeadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get("email") as string)?.trim();
    const name = (formData.get("name") as string)?.trim() || "";
    const site = (formData.get("site") as string)?.trim() || "";
    const phone = (formData.get("phone") as string)?.trim() || "";
    if (!email) return;
    try {
      await supabase.from("leads").upsert({ email, name, site, phone, source: "preview_unlock" } as any, { onConflict: "email" });
    } catch (_) { /* silently continue */ }
    setLeadSubmitted(true);
  };

  const handleDownloadPDF = useCallback(async () => {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    try {
      const el = reportRef.current;

      // 1. Force all content visible (override height/overflow)
      const originalHeight = el.style.height;
      const originalOverflow = el.style.overflow;
      el.style.height = "auto";
      el.style.overflow = "visible";

      // 2. Force all framer-motion animated elements to be fully visible
      const motionEls = el.querySelectorAll<HTMLElement>("[style*='opacity'], [style*='transform']");
      const originalStyles: { el: HTMLElement; opacity: string; transform: string }[] = [];
      motionEls.forEach((m) => {
        originalStyles.push({ el: m, opacity: m.style.opacity, transform: m.style.transform });
        m.style.opacity = "1";
        m.style.transform = "none";
      });

      // 3. Wait for layout recalc
      await new Promise((r) => setTimeout(r, 600));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 800,
        scrollY: 0,
        y: 0,
        height: el.scrollHeight,
        width: el.scrollWidth,
      });

      // 4. Restore original styles
      el.style.height = originalHeight;
      el.style.overflow = originalOverflow;
      originalStyles.forEach(({ el: m, opacity, transform }) => {
        m.style.opacity = opacity;
        m.style.transform = transform;
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const usableHeight = pageHeight - margin * 2;

      // 5. Paginate correctly — page 0 first, then subsequent pages
      const totalPages = Math.ceil(imgHeight / usableHeight);
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        const yOffset = margin - page * usableHeight;
        pdf.addImage(imgData, "JPEG", margin, yOffset, imgWidth, imgHeight);
      }

      pdf.save(`diagnostico-ivero-${siteUrl || "marca"}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [siteUrl, exporting]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30" ref={reportRef}
    >
      {/* Lead capture dialog removed — using inline gate instead */}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl print:hidden">
        <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-xl font-display font-bold text-gradient">
            Ivero
          </button>
          <div className="flex items-center gap-2">
            {leadSubmitted && (
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={exporting} className="gap-1.5 rounded-full border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all">
                <Download className="w-4 h-4" />
                {exporting ? "Gerando..." : "Baixar PDF"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/preview")} className="rounded-full border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all">
              Nova Análise
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-3xl space-y-8">
        {/* Title — Diagnóstico de Influência em IA */}
        <AnimatedSection>
          <div className="space-y-2">
            {/* Badge removed per request */}
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              {siteUrl || "Seu site"}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              A IA está decidindo quem recomendar. Veja onde sua marca se posiciona.
            </p>
            {/* Plan indicator removed — avoid impression everything is locked */}
          </div>
        </AnimatedSection>

        {/* ── Score + AI Presence ── */}
        <AnimatedSection delay={0.1}>
          <PremiumCard glow>
            <div className="space-y-6">
              <ScoreCircle score={37} benchmark={58} />

              <div className="pt-5 border-t border-border/60 space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Presença nas IAs</p>
                  <span className="px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200/60 shadow-sm">
                    Sentimento Misto
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
              </div>
            </div>
          </PremiumCard>
        </AnimatedSection>

        {/* ── Radar Estratégico ── */}
        <AnimatedSection delay={0.12}>
          <PremiumCard>
            <div className="space-y-5">
              <SectionHeader icon={Target} title="Radar Estratégico" subtitle="Os 5 pilares que determinam se a IA recomenda sua marca" />

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

              {/* Dynamic phrase + strength/weakness — blur starts here when locked */}
              <div className={`relative ${!leadSubmitted ? "select-none pointer-events-none" : ""}`}>
                <div className={!leadSubmitted ? "blur-[2.5px] opacity-55" : ""}>
                  <div className="rounded-xl bg-red-50/80 border border-red-200/60 p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700 font-medium leading-relaxed">{getWeakestPillarPhrase()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/60 p-4 text-center shadow-sm">
                      <p className="text-xs text-muted-foreground font-medium">Principal ponto forte</p>
                      <p className="text-base font-display font-bold text-emerald-700 mt-1">Clareza</p>
                      <p className="text-xs text-emerald-600/70 mt-0.5">Score: 82/100</p>
                    </div>
                    <div className="rounded-xl bg-red-50/80 border border-red-200/60 p-4 text-center shadow-sm">
                      <p className="text-xs text-muted-foreground font-medium">Maior vulnerabilidade</p>
                      <p className="text-base font-display font-bold text-red-700 mt-1">Autoridade</p>
                      <p className="text-xs text-red-600/70 mt-0.5">Score: 35/100</p>
                    </div>
                  </div>
                </div>
                {!leadSubmitted && (
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card via-card/80 to-transparent rounded-b-xl" />
                )}
              </div>
            </div>
          </PremiumCard>
        </AnimatedSection>

        {/* ── BLURRED TEASER + LEAD GATE ── */}
        {!leadSubmitted && (
          <>
            <AnimatedSection delay={0.15}>
              <div className="relative overflow-hidden rounded-2xl max-h-[280px]">
                <div className="space-y-3 blur-[3px] opacity-50 select-none pointer-events-none">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Diagnóstico Detalhado
                    </h2>
                  </div>
                  <PremiumCard>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200/60">
                        <Eye className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-display font-bold text-foreground">Clareza</p>
                        <p className="text-xs text-muted-foreground">Score: 82/100 · Forte</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: "82%" }} />
                    </div>
                  </PremiumCard>
                </div>
                <div className="blur-[7px] opacity-25 select-none pointer-events-none -mt-1">
                  <PremiumCard>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-100 border border-red-200/60">
                        <ShieldCheck className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-display font-bold text-foreground">Autoridade</p>
                        <p className="text-xs text-muted-foreground">Score: 35/100 · Crítico</p>
                      </div>
                    </div>
                  </PremiumCard>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/95 to-transparent" />
              </div>
            </AnimatedSection>

            {/* Lead gate form */}
            <AnimatedSection delay={0.18}>
              <div className="relative rounded-2xl overflow-hidden -mt-8">
                <div className="absolute inset-0 bg-ivero-gradient" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(330,85%,55%/0.3),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(265,70%,40%/0.4),transparent_50%)]" />
                <div className="relative z-10 p-8 sm:p-10 text-center space-y-6">
                  <div className="space-y-2">
                    <Lock className="w-8 h-8 text-primary-foreground/80 mx-auto" />
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-primary-foreground leading-snug">
                      Desbloqueie a análise completa
                    </h2>
                    <p className="text-sm text-primary-foreground/70 max-w-md mx-auto">
                      Você está vendo apenas o resumo. Preencha abaixo para acessar os 5 pilares detalhados, plano de ação personalizado e previsão de impacto.
                    </p>
                  </div>
                  <form onSubmit={handleLeadSubmit} className="flex flex-col gap-3 max-w-sm mx-auto">
                    <input name="name" type="text" required placeholder="Nome" maxLength={100}
                      className="h-12 rounded-xl border-0 px-4 text-foreground placeholder:text-muted-foreground text-sm outline-none bg-white/95 shadow-sm" />
                    <input name="email" type="email" required placeholder="E-mail corporativo" maxLength={255}
                      className="h-12 rounded-xl border-0 px-4 text-foreground placeholder:text-muted-foreground text-sm outline-none bg-white/95 shadow-sm" />
                    <input name="site" type="text" placeholder="Site da empresa (ex: www.empresa.com.br)" maxLength={255}
                      className="h-12 rounded-xl border-0 px-4 text-foreground placeholder:text-muted-foreground text-sm outline-none bg-white/95 shadow-sm" />
                    <input name="phone" type="tel" placeholder="Celular" maxLength={20}
                      className="h-12 rounded-xl border-0 px-4 text-foreground placeholder:text-muted-foreground text-sm outline-none bg-white/95 shadow-sm" />
                    <Button type="submit" size="lg"
                      className="bg-white text-foreground hover:bg-white/90 border-0 text-base h-12 px-8 rounded-full font-semibold shadow-[0_4px_20px_-4px_hsl(0,0%,100%/0.4)] hover:shadow-[0_6px_30px_-4px_hsl(0,0%,100%/0.5)] transition-all w-full mt-1">
                      Desbloquear diagnóstico completo
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <p className="text-xs text-primary-foreground/50">Seus dados estão seguros. Sem spam.</p>
                  </form>
                </div>
              </div>
            </AnimatedSection>
          </>
        )}

        {/* ── Everything below only shows after lead submission ── */}
        {leadSubmitted && (
          <>
            {/* ── 5 Pilares Detalhados ── */}
            <AnimatedSection delay={0.05}>
              <div className="space-y-2 mb-2">
                <h2 className="text-base sm:text-lg font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Diagnóstico Detalhado
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">Cada pilar impacta diretamente se a IA recomenda ou ignora sua marca.</p>
              </div>
            </AnimatedSection>

            {pillarDetails.map((pillar, idx) => {
              const PillarIcon = pillar.icon;
              const scoreColor = pillar.score >= 70 ? "emerald" : pillar.score >= 50 ? "amber" : "red";
              const statusBg = scoreColor === "emerald" ? "bg-emerald-50 border-emerald-200/60 text-emerald-700" : scoreColor === "amber" ? "bg-amber-50 border-amber-200/60 text-amber-700" : "bg-red-50 border-red-200/60 text-red-700";
              const barColor = scoreColor === "emerald" ? "bg-emerald-500" : scoreColor === "amber" ? "bg-amber-500" : "bg-red-500";

              return (
                <AnimatedSection key={pillar.name} delay={0.08 + idx * 0.06}>
                  <PremiumCard>
                    <div className="space-y-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ivero-gradient shadow-sm">
                            <PillarIcon className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div>
                            <h3 className="text-base font-display font-bold text-foreground">{pillar.name}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">{pillar.summary}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-2">
                          <div>
                            <span className="text-2xl font-display font-bold text-foreground">{pillar.score}</span>
                            <span className="text-xs text-muted-foreground">/100</span>
                          </div>
                          <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${statusBg}`}>
                            {pillar.status}
                          </div>
                        </div>
                      </div>

                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${barColor}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pillar.score}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                      </div>

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

                      {pillar.weaknesses && pillar.weaknesses.length > 0 && (
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

                      <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 space-y-1.5">
                        <p className="text-xs font-semibold text-primary uppercase tracking-widest">Estratégia de Domínio</p>
                        <p className="text-sm text-foreground leading-relaxed">{pillar.recommendation}</p>
                      </div>
                    </div>
                  </PremiumCard>
                </AnimatedSection>
              );
            })}

            {/* ── CTA WhatsApp ── */}
            <AnimatedSection delay={0.5}>
              <div className="rounded-2xl border border-primary/20 bg-ivero-gradient-soft p-10 text-center space-y-5">
                <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                  💜 Queremos você como nosso cliente
                </p>
                <p className="text-base text-muted-foreground max-w-md mx-auto">
                  Sua marca merece aparecer nas respostas das IAs. Fale com a gente e descubra como.
                </p>
                <a
                  href="https://wa.me/5511999999999?text=Quero%20que%20minha%20marca%20apareça%20nas%20IAs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-10 py-4.5 rounded-full bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white font-bold text-base shadow-[0_4px_24px_-4px_hsl(142,70%,45%/0.45)] hover:shadow-[0_8px_36px_-4px_hsl(142,70%,45%/0.55)] transition-all hover:scale-105"
                >
                  <Phone className="w-6 h-6" />
                  <span className="text-lg font-bold">Falar com a Ivero no WhatsApp</span>
                </a>
              </div>
            </AnimatedSection>

            {/* ── Diagnóstico Final ── */}
            <AnimatedSection delay={0.54}>
              <PremiumCard glow>
                <div className="space-y-4">
                  <SectionHeader icon={Brain} title="Diagnóstico Final" subtitle="A análise mais importante sobre o futuro da sua marca em IA" />
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
                </div>
              </PremiumCard>
            </AnimatedSection>

            {/* ── Plano de Ação ── */}
            <AnimatedSection delay={0.58}>
              <PremiumCard>
                <div className="space-y-4">
                  <SectionHeader icon={TrendingUp} title="Plano de Ação Recomendado" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {["Otimizar conteúdo para perguntas frequentes", "Criar páginas de comparação", "Backlinks autoritativos", "Monitorar menções"].map((a, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-xl bg-muted/30 border border-border/40 p-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-ivero-gradient text-primary-foreground text-xs font-bold shrink-0">{i + 1}</span>
                        <span className="text-sm text-muted-foreground">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </PremiumCard>
            </AnimatedSection>

            {/* ── Previsão de Impacto ── */}
            <AnimatedSection delay={0.62}>
              <PremiumCard>
                <div className="space-y-4">
                  <SectionHeader icon={Rocket} title="Previsão de Impacto" />
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
              </PremiumCard>
            </AnimatedSection>

            {/* ── Ivero Features ── */}
            <AnimatedSection delay={0.68}>
              <PremiumCard glow>
                <div className="space-y-6">
                  <SectionHeader icon={Sparkles} title="🚀 Construa influência real nas respostas das IAs." subtitle="A Ivero posiciona você como referência — não apenas como mais uma opção." />
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
                    onClick={() => { navigate("/"); setTimeout(() => { document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" }); }, 300); }}
                  >
                    Conheça nossos planos
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </PremiumCard>
            </AnimatedSection>
          </>
        )}
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
