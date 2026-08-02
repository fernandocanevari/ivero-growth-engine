import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowRight, Search, Globe, Brain, Bot, Zap, BarChart3,
  AlertTriangle, TrendingUp, CheckCircle2, Sparkles, Loader2,
  Lock, Unlock, Target, Eye, Rocket, Download, Mail,
  Activity, ShieldCheck, LineChart, MessageSquare, Gauge, Radio,
  Phone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { identifyLead, track } from "@/lib/analytics";
import { formatPhoneBR } from "@/lib/format-phone";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from "recharts";

/* ── Lead gate validation schema ── */
const leadSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo").max(100, "Nome muito longo"),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .max(255, "E-mail muito longo")
    .refine((v) => /\.[a-z]{2,}$/i.test(v), "E-mail incompleto (ex: nome@empresa.com)"),
  site: z.string().trim().max(255).optional(),
  phone: z
    .string()
    .trim()
    .min(1, "Informe seu celular")
    .max(20)
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Celular incompleto (ex: (11) 99999-9999)"),
});


/* ── Animated section wrapper ── */
function AnimatedSection({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      data-pdf-section
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
  { icon: Search, text: "Investigando como as IAs enxergam sua marca..." },
  { icon: Globe, text: "Mapeando sua presença em ChatGPT, Gemini e Google Modo IA..." },
  { icon: Bot, text: "Detectando onde sua marca está sendo ignorada..." },
  { icon: BarChart3, text: "Revelando o caminho para virar referência..." },
];

/* ── AI engine result type ── */
interface AIEngineResult {
  name: string;
  found: boolean;
  error?: boolean;
  errorMessage?: string;
}

/* ── Pillar criterion (sub-criterio) ── */
interface PillarCriterion {
  nome: string;
  score: number;
  peso: number;
  justificativa?: string;
  consenso?: { agree: number; total: number }; // how many models agree (within ±15 of avg)
}

/* ── Pillar analysis result ── */
interface PillarAnalysis {
  name: string;
  mentions: number; // how many AIs scored the brand >= 50 in this pillar
  score: number; // average score across models (0-100)
  radarValue: number; // same as score (0-100)
  hasData: boolean; // false quando nenhum modelo retornou avaliação para este pilar
  criterios: PillarCriterion[]; // 3 sub-criteria averaged across models
  aiDetails: { model: string; mentioned: boolean; score: number; justificativa: string }[];
}

/* ── Estado inicial dos motores: nada "encontrado" até um modelo real responder ── */
const defaultAiEngines: AIEngineResult[] = [
  { name: "ChatGPT", found: false },
  { name: "Gemini", found: false },
  { name: "Google Modo IA", found: false },
];


/* (Per-pillar prompts foram substituídos pelo modo "diagnostico" — a edge function agora usa o prompt do Radar Estratégico IVERO e retorna scores 0-100 + justificativa por pilar em uma única chamada por modelo.) */

/* ── Build dynamic pillar details from analysis ── */
function buildPillarDetails(pillarResults: PillarAnalysis[]) {
  const pillarConfig: Record<string, { icon: React.ElementType; summaryGood: string; summaryMid: string; summaryBad: string; strengths: string[]; weaknesses: string[]; recGood: string; recBad: string }> = {
    Clareza: {
      icon: Eye,
      summaryGood: "Sua marca comunica de forma direta o que faz e para quem.",
      summaryMid: "Sua comunicação é parcialmente clara, mas pode ser mais direta.",
      summaryBad: "Falta clareza na comunicação — IAs não compreendem sua proposta.",
      strengths: ["Headline objetiva → IA compreende o core business rapidamente", "Benefícios claros → Aumenta chances de recomendação contextual"],
      weaknesses: ["Proposta de valor confusa → IA não sabe o que sua empresa faz", "Mensagem genérica → Reduz diferenciação nas respostas de IA"],
      recGood: "Mantenha a comunicação clara e reforce a diferenciação competitiva.",
      recBad: "Reforce a proposta única de valor e a diferenciação competitiva para maximizar o impacto em respostas de IA.",
    },
    Autoridade: {
      icon: ShieldCheck,
      summaryGood: "Sua marca é reconhecida como autoridade pelas IAs.",
      summaryMid: "Autoridade parcial — algumas IAs reconhecem, outras não.",
      summaryBad: "Autoridade baixa reduz drasticamente a chance de recomendação nas IAs.",
      strengths: ["Reconhecimento detectado → IAs citam sua marca como referência", "Presença online sólida → Base de autoridade identificada"],
      weaknesses: ["Ausência de backlinks de qualidade → IA não reconhece referências externas", "Sem menções em mídia especializada → Reduz credibilidade algorítmica", "Conteúdo técnico insuficiente → Limita profundidade de indexação por IA"],
      recGood: "Continue investindo em conteúdo de autoridade e backlinks de qualidade.",
      recBad: "Invista em backlinks de alta qualidade, menções em mídia especializada e conteúdo técnico aprofundado.",
    },
    Conversão: {
      icon: Target,
      summaryGood: "IAs recomendam sua marca ativamente quando perguntadas.",
      summaryMid: "CTAs presentes mas sem otimização para jornadas vindas de IA.",
      summaryBad: "Baixa conversão — visitantes vindos de IA não se tornam clientes.",
      strengths: ["CTAs visíveis → Caminho de conversão existente", "Formulário acessível → Ponto de contato disponível"],
      weaknesses: ["Sem landing pages para tráfego de IA → Perde visitantes que chegam via respostas", "Ausência de prova social contextual → Reduz taxa de conversão em 40%"],
      recGood: "Otimize as landing pages para visitantes vindos de respostas de IA.",
      recBad: "Crie landing pages específicas para visitantes vindos de respostas de IA, com contexto personalizado e prova social.",
    },
    Posicionamento: {
      icon: Rocket,
      summaryGood: "Posicionamento forte — IAs destacam sua marca no mercado.",
      summaryMid: "Posicionamento técnico sólido, mas falta diferenciação emocional.",
      summaryBad: "Posicionamento fraco faz a IA recomendar concorrentes no seu lugar.",
      strengths: ["Linguagem profissional → Consistência na comunicação", "Foco em valor → Diferenciação por benefício detectada"],
      weaknesses: ["Sem storytelling → IA gera respostas genéricas sobre sua marca", "Elementos aspiracionais ausentes → Reduz engajamento nas recomendações"],
      recGood: "Mantenha o storytelling e adicione mais elementos de diferenciação.",
      recBad: "Adicione elementos aspiracionais e storytelling à comunicação para que IAs gerem respostas mais humanizadas.",
    },
    Relevância: {
      icon: Sparkles,
      summaryGood: "Sua marca é citada em contextos altamente relevantes ao seu nicho.",
      summaryMid: "Relevância parcial — sua marca aparece em alguns contextos do setor.",
      summaryBad: "Baixa relevância contextual — IAs não associam sua marca ao seu nicho.",
      strengths: ["Presença em buscas do setor → IA associa sua marca ao nicho correto", "Citações em contextos relevantes → Reforça autoridade temática"],
      weaknesses: ["Ausência em discussões do setor → IA não conecta sua marca ao nicho", "Falta de conteúdo contextual → Reduz associação temática nas respostas de IA"],
      recGood: "Mantenha a produção de conteúdo relevante ao nicho e amplie a presença em discussões do setor.",
      recBad: "Produza conteúdo altamente relevante ao seu nicho e participe ativamente de discussões e publicações do setor.",
    },
  };

  return pillarResults.map((p) => {
    const config = pillarConfig[p.name];
    if (!config) return null;

    // Sem nenhum modelo válido neste pilar: nada de score, banda ou diagnóstico inventado.
    if (!p.hasData) {
      return {
        name: p.name,
        score: null as number | null,
        hasData: false,
        icon: config.icon,
        color: "muted",
        status: "Sem dados" as const,
        summary: "Nenhum modelo de IA retornou avaliação para este pilar nesta análise.",
        criterios: [] as PillarCriterion[],
        strengths: [] as string[],
        weaknesses: undefined,
        recommendation: "Repita a análise para obter a leitura deste pilar.",
      };
    }

    const status = p.radarValue >= 70 ? "Forte" as const : p.radarValue >= 40 ? "Moderado" as const : "Crítico" as const;
    const summary = p.radarValue >= 70 ? config.summaryGood : p.radarValue >= 40 ? config.summaryMid : config.summaryBad;
    const recommendation = p.radarValue >= 60 ? config.recGood : config.recBad;

    return {
      name: p.name,
      score: p.radarValue as number | null,
      hasData: true,
      icon: config.icon,
      color: p.radarValue >= 70 ? "emerald" : p.radarValue >= 40 ? "amber" : "red",
      status,
      summary,
      criterios: p.criterios,
      strengths: p.mentions > 0 ? config.strengths : [config.strengths[0]],
      weaknesses: p.mentions < 3 ? config.weaknesses : undefined,
      recommendation,
    };

  }).filter(Boolean);
}

/* ── Score band helper (Crítico / Insuficiente / Sólido / Referência) ── */
function getScoreBand(score: number) {
  if (score < 40) return { label: "Crítico", color: "red" as const };
  if (score < 60) return { label: "Insuficiente", color: "amber" as const };
  if (score < 80) return { label: "Sólido", color: "blue" as const };
  return { label: "Referência", color: "emerald" as const };
}

/* ── Dynamic phrase for weakest pillar ── */
function getWeakestPillarPhrase(dynamicRadarData: { subject: string; value: number }[]): string {
  const weakest = [...dynamicRadarData].sort((a, b) => a.value - b.value)[0];
  const phrases: Record<string, string> = {
    Clareza: "Falta de clareza diminui a compreensão da IA sobre sua proposta de valor.",
    Autoridade: "Autoridade baixa reduz drasticamente a chance de recomendação nas IAs.",
    Conversão: "Baixa conversão significa que visitantes vindos de IA não se tornam clientes.",
    Posicionamento: "Posicionamento fraco faz a IA recomendar concorrentes no seu lugar.",
    Relevância: "Baixa relevância contextual faz a IA não associar sua marca ao seu nicho.",
  };
  return phrases[weakest?.subject] || phrases["Autoridade"];
}

/* ── Score level helper ── */
function getScoreLevel(score: number) {
  if (score <= 40) return { label: "Invisível", color: "red", emoji: "🔴", message: "Sua marca está sendo pouco recomendada nas IAs da sua categoria." };
  if (score <= 70) return { label: "Competindo", color: "amber", emoji: "🟡", message: "Você está abaixo do nível competitivo ideal para recomendação em IA." };
  return { label: "Influenciando", color: "emerald", emoji: "🟢", message: "Sua marca já tem forte presença nas IAs — agora é hora de consolidar liderança." };
}

const iveroFeatures = [
  { icon: Activity, label: "Monitoramento Multi-IA", desc: "Presença em ChatGPT, Gemini e Google Modo IA" },
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
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <p className="text-base font-display font-semibold text-foreground">Score de Presença GEO</p>
              {(() => {
                const band = getScoreBand(score);
                const bandClass =
                  band.color === "red"
                    ? "bg-red-50 text-red-700 border-red-200/60"
                    : band.color === "amber"
                    ? "bg-amber-50 text-amber-700 border-amber-200/60"
                    : band.color === "blue"
                    ? "bg-sky-50 text-sky-700 border-sky-200/60"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200/60";
                return (
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${bandClass}`}>
                    {band.label}
                  </span>
                );
              })()}
            </div>
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
function DiagnosticReport({ siteUrl, aiEngines, geoScore, scoreIsReal = true, dynamicRadarData, dynamicPillarDetails }: { siteUrl: string; aiEngines: AIEngineResult[]; geoScore: number; scoreIsReal?: boolean; dynamicRadarData: { subject: string; value: number; fullMark: number }[]; dynamicPillarDetails: any[] }) {
  // Score real ou nada: nunca propagar número fabricado para lead/proposta.
  const scoreForRecords: number | null = scoreIsReal && geoScore > 0 ? geoScore : null;

  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // Auto-unlock: quem veio do formulário completo do Hero já se identificou (name + email na URL).
  const [gateParams] = useSearchParams();
  const prefillName = (gateParams.get("name") || "").trim();
  const prefillEmail = (gateParams.get("email") || "").trim();
  const prefillPhone = formatPhoneBR(gateParams.get("phone") || "");
  const cameIdentifiedFromHero =
    prefillName.length >= 2 && leadSchema.shape.email.safeParse(prefillEmail).success;

  const [leadSubmitted, setLeadSubmitted] = useState(cameIdentifiedFromHero);
  const [leadData, setLeadData] = useState<{ name: string; email: string; site: string; phone: string }>({
    name: cameIdentifiedFromHero ? prefillName : "",
    email: cameIdentifiedFromHero ? prefillEmail : "",
    site: cameIdentifiedFromHero ? siteUrl : "",
    phone: cameIdentifiedFromHero ? prefillPhone : "",
  });


  const handleLeadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const rawEmail = (formData.get("email") as string)?.trim() || "";
    const rawName = (formData.get("name") as string)?.trim() || "";
    const rawSite = (formData.get("site") as string)?.trim() || "";
    const rawPhone = (formData.get("phone") as string)?.trim() || "";

    // Strict validation — HTML5 type="email" is too lenient (accepts "joao@gmail")
    const parsed = leadSchema.safeParse({
      name: rawName,
      email: rawEmail,
      site: rawSite,
      phone: rawPhone,
    });
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Dados inválidos";
      toast({ title: "Verifique seus dados", description: firstError, variant: "destructive" });
      return;
    }

    const { name, email, site, phone } = parsed.data;
    try {
      await supabase
        .from("leads")
        .upsert({ email, name, site: site || "", phone: phone || "", source: "preview_unlock" } as any, {
          onConflict: "email",
        });
    } catch (_) { /* silently continue */ }
    setLeadData({ name, email, site: site || "", phone: phone || "" });
    setLeadSubmitted(true);

    // Funnel step 2: preview gate unlocked. Re-identify in case the user
    // arrived here directly (without going through the hero form).
    identifyLead(email, { name, source: "preview_unlock" });
    track("preview_gate_unlocked", {
      email,
      score_inicial: scoreForRecords,
      analyzed_url: siteUrl,
    });

    toast({ title: "Análise completa desbloqueada", description: "Role para ver todos os pilares estratégicos." });
    // Scroll to top so user sees full analysis from the beginning
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Build a query string with the lead data so the signup page can pre-populate fields and create profile
  const buildSignupUrl = () => {
    const params = new URLSearchParams({
      mode: "signup",
      email: leadData.email,
      name: leadData.name,
      site: leadData.site || siteUrl,
      phone: leadData.phone,
    });
    return `/auth?${params.toString()}`;
  };

  // Always force a clean signup: if any old session exists in localStorage
  // (e.g. admin testing), sign out before navigating so the lead doesn't
  // land on someone else's dashboard.
  const goToSignup = async (ctaOrigin: string = "criar_conta") => {
    // Funnel step 3: signup started. Track BEFORE signOut so we don't
    // lose identity (signOut would clear PostHog if we reset there).
    track("signup_started", {
      email: leadData.email,
      cta_origin: ctaOrigin,
      score_inicial: scoreForRecords,
    });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await supabase.auth.signOut();
    } catch (_) { /* ignore */ }
    navigate(buildSignupUrl());
  };

  const handleDownloadPDF = useCallback(async () => {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    try {
      const el = reportRef.current;

      // 1. Scroll to top to avoid offset issues
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 100));

      // 2. Force all content visible
      const originalHeight = el.style.height;
      const originalOverflow = el.style.overflow;
      const originalPosition = el.style.position;
      el.style.height = "auto";
      el.style.overflow = "visible";
      el.style.position = "relative";

      // 3. Force all framer-motion animated elements to be fully visible
      const allEls = el.querySelectorAll<HTMLElement>("*");
      const savedStyles: { el: HTMLElement; opacity: string; transform: string; visibility: string }[] = [];
      allEls.forEach((m) => {
        if (m.style.opacity !== "" || m.style.transform !== "" || m.style.visibility === "hidden") {
          savedStyles.push({ el: m, opacity: m.style.opacity, transform: m.style.transform, visibility: m.style.visibility });
          m.style.opacity = "1";
          m.style.transform = "none";
          m.style.visibility = "visible";
        }
      });

      // 4. Wait for layout recalc
      await new Promise((r) => setTimeout(r, 500));

      // 5. Find all PDF sections
      const contentArea = el.querySelector(".space-y-8") as HTMLElement || el;
      let sections = Array.from(contentArea.querySelectorAll<HTMLElement>("[data-pdf-section]"));
      if (sections.length === 0) {
        sections = Array.from(contentArea.children) as HTMLElement[];
      }
      // Filter only visible sections
      sections = sections.filter((s) => s.offsetHeight > 0 && s.offsetWidth > 0);

      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      const MARGIN_MM = 10;
      const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;
      const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2;
      const SECTION_GAP_MM = 3;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      let currentY = MARGIN_MM;
      let pageStarted = true; // first page already exists

      for (const section of sections) {
        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: 800,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
        });

        if (canvas.width === 0 || canvas.height === 0) continue;

        const scaleFactor = CONTENT_WIDTH_MM / (canvas.width / 2);
        const sectionHeightMM = (canvas.height / 2) * scaleFactor;
        const imgData = canvas.toDataURL("image/jpeg", 0.92);

        // Check if section fits on current page
        const remainingSpace = A4_HEIGHT_MM - MARGIN_MM - currentY;

        if (sectionHeightMM <= remainingSpace) {
          // Fits on current page
          pdf.addImage(imgData, "JPEG", MARGIN_MM, currentY, CONTENT_WIDTH_MM, sectionHeightMM);
          currentY += sectionHeightMM + SECTION_GAP_MM;
        } else if (sectionHeightMM <= CONTENT_HEIGHT_MM) {
          // Doesn't fit but fits on a fresh page
          pdf.addPage();
          currentY = MARGIN_MM;
          pdf.addImage(imgData, "JPEG", MARGIN_MM, currentY, CONTENT_WIDTH_MM, sectionHeightMM);
          currentY += sectionHeightMM + SECTION_GAP_MM;
        } else {
          // Section is taller than a full page — slice it
          if (currentY > MARGIN_MM + 1) {
            pdf.addPage();
            currentY = MARGIN_MM;
          }
          const totalSlices = Math.ceil(sectionHeightMM / CONTENT_HEIGHT_MM);
          for (let s = 0; s < totalSlices; s++) {
            if (s > 0) {
              pdf.addPage();
            }
            const yOffset = MARGIN_MM - s * CONTENT_HEIGHT_MM;
            pdf.addImage(imgData, "JPEG", MARGIN_MM, yOffset, CONTENT_WIDTH_MM, sectionHeightMM);
          }
          const lastSliceUsed = sectionHeightMM % CONTENT_HEIGHT_MM;
          currentY = MARGIN_MM + (lastSliceUsed > 0 ? lastSliceUsed : CONTENT_HEIGHT_MM) + SECTION_GAP_MM;
        }
      }

      // 6. Restore original styles
      el.style.height = originalHeight;
      el.style.overflow = originalOverflow;
      el.style.position = originalPosition;
      savedStyles.forEach(({ el: m, opacity, transform, visibility }) => {
        m.style.opacity = opacity;
        m.style.transform = transform;
        m.style.visibility = visibility;
      });

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
              <ScoreCircle score={geoScore} benchmark={58} />

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

              {/* Contador livre: quantidade de pilares fortes/críticos (sem revelar quais) */}
              {(() => {
                const scored = (dynamicPillarDetails || []).filter((p: any) => p?.hasData && typeof p.score === "number");
                if (scored.length === 0) return null;
                const strong = scored.filter((p: any) => p.score >= 60).length;
                const critical = scored.length - strong;
                return (
                  <div className="pt-5 border-t border-border/60 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Leitura dos pilares</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {strong} {strong === 1 ? "ponto forte" : "pontos fortes"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60 shadow-sm">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {critical} {critical === 1 ? "ponto crítico" : "pontos críticos"}
                      </span>
                      <span className="text-xs text-muted-foreground">identificados em {scored.length} pilares</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </PremiumCard>
        </AnimatedSection>


        {/* ── LEAD GATE inline (sticky) — logo abaixo do score ── */}
        {!leadSubmitted && (
          <AnimatedSection delay={0.12}>
            <div className="sticky top-16 z-40 relative rounded-2xl overflow-hidden shadow-[0_18px_56px_-24px_hsl(265,70%,28%/0.55)]">
              <div className="absolute inset-0 bg-ivero-gradient" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(330,85%,55%/0.3),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(265,70%,40%/0.4),transparent_50%)]" />
              <div className="relative z-10 p-6 sm:p-8 text-center space-y-5">
                <div className="space-y-2">
                  <Lock className="w-8 h-8 text-primary-foreground/80 mx-auto" />
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-primary-foreground leading-snug">
                    Desbloqueie a análise completa
                  </h2>
                  <p className="text-sm text-primary-foreground/70 max-w-md mx-auto">
                    Você já viu seu score e sua presença nas IAs. Preencha abaixo para liberar o Radar Estratégico, os 5 pilares detalhados, o diagnóstico final e o plano de ação.
                  </p>
                </div>
                <form onSubmit={handleLeadSubmit} className="flex flex-col gap-3 max-w-sm mx-auto">
                  <input name="name" type="text" required placeholder="Nome" maxLength={100} defaultValue={prefillName}
                    className="h-12 rounded-xl border-0 px-4 text-foreground placeholder:text-muted-foreground text-sm outline-none bg-white/95 shadow-sm" />
                  <input name="email" type="email" required placeholder="E-mail corporativo" maxLength={255} defaultValue={prefillEmail}
                    className="h-12 rounded-xl border-0 px-4 text-foreground placeholder:text-muted-foreground text-sm outline-none bg-white/95 shadow-sm" />
                  <input name="site" type="text" placeholder="Site da empresa (ex: www.empresa.com.br)" maxLength={255} defaultValue={siteUrl}
                    className="h-12 rounded-xl border-0 px-4 text-foreground placeholder:text-muted-foreground text-sm outline-none bg-white/95 shadow-sm" />
                  <input name="phone" type="tel" required inputMode="numeric" placeholder="Celular (11) 99999-9999" maxLength={16} defaultValue={prefillPhone}
                    onInput={(e) => { const t = e.currentTarget; t.value = formatPhoneBR(t.value); }}
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
        )}



        {/* ── Radar Estratégico ── */}
        <AnimatedSection delay={0.12}>
          <PremiumCard>
            <div className="space-y-5">
              <SectionHeader icon={Target} title="Radar Estratégico" subtitle="Os 5 pilares que determinam se a IA recomenda sua marca" />

              {(() => {
                // Quando bloqueado: forma/valores borrados, mas os nomes dos 2 pilares
                // mais fracos permanecem legíveis nos próprios eixos do radar.
                const scoredPillars = (dynamicPillarDetails || []).filter((p: any) => p?.hasData && typeof p.score === "number");
                const weakestNames = [...scoredPillars].sort((a: any, b: any) => a.score - b.score).slice(0, 2).map((p: any) => p.name);

                const TeaserTick = (props: any) => {
                  const { payload, x, y, textAnchor } = props;
                  if (!weakestNames.includes(payload.value)) return null;
                  return (
                    <text x={x} y={y} dy={4} textAnchor={textAnchor} className="fill-red-700" fontSize={12} fontWeight={700}>
                      {payload.value}
                    </text>
                  );
                };

                const locked = !leadSubmitted;
                return (
                  <div
                    className={`w-full h-72 relative ${
                      locked
                        ? "select-none pointer-events-none [&_.recharts-polar-grid]:blur-[6px] [&_.recharts-polar-grid]:opacity-45 [&_.recharts-radar]:blur-[6px] [&_.recharts-radar]:opacity-45"
                        : ""
                    }`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={dynamicRadarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.6} />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={locked && weakestNames.length === 2 ? (TeaserTick as any) : { fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }}
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
                    {locked && weakestNames.length === 2 && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-muted/70 text-muted-foreground border border-border/60">
                        <Lock className="w-3 h-3" />
                        Scores e demais pilares bloqueados
                      </div>
                    )}
                  </div>
                );
              })()}



              {/* Dynamic phrase + strength/weakness — blur starts here when locked */}
              <div className={`relative ${!leadSubmitted ? "select-none pointer-events-none" : ""}`}>
                <div className={!leadSubmitted ? "blur-[2.5px] opacity-55" : ""}>
                  <div className="rounded-xl bg-red-50/80 border border-red-200/60 p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700 font-medium leading-relaxed">{getWeakestPillarPhrase(dynamicRadarData)}</p>
                    </div>
                  </div>

                  {(() => {
                    const sorted = [...dynamicRadarData].sort((a, b) => b.value - a.value);
                    const strongest = sorted[0];
                    const weakest = sorted[sorted.length - 1];
                    return (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/60 p-4 text-center shadow-sm">
                          <p className="text-xs text-muted-foreground font-medium">Principal ponto forte</p>
                          <p className="text-base font-display font-bold text-emerald-700 mt-1">{strongest?.subject}</p>
                          <p className="text-xs text-emerald-600/70 mt-0.5">Score: {strongest?.value}/100</p>
                        </div>
                        <div className="rounded-xl bg-red-50/80 border border-red-200/60 p-4 text-center shadow-sm">
                          <p className="text-xs text-muted-foreground font-medium">Maior vulnerabilidade</p>
                          <p className="text-base font-display font-bold text-red-700 mt-1">{weakest?.subject}</p>
                          <p className="text-xs text-red-600/70 mt-0.5">Score: {weakest?.value}/100</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {!leadSubmitted && (
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card via-card/80 to-transparent rounded-b-xl" />
                )}
              </div>
            </div>
          </PremiumCard>
        </AnimatedSection>

        {/* ── CTA: Crie sua conta executiva (alto impacto, dark interrupt) ── */}
        {leadSubmitted && (
          <AnimatedSection delay={0.08}>
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative overflow-hidden rounded-[1.75rem] my-5 p-5 sm:p-6 bg-gradient-to-br from-ivero-dark via-ivero-purple to-accent shadow-[0_18px_56px_-22px_hsl(var(--accent)/0.45)] border border-primary-foreground/10"
            >
              <div className="absolute -top-20 -left-12 w-56 h-56 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-12 w-56 h-56 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
              <div className="absolute inset-x-10 top-1/2 h-20 -translate-y-1/2 bg-ivero-gradient-soft blur-2xl pointer-events-none" />

              <motion.div
                className="absolute inset-0 rounded-[1.75rem] pointer-events-none"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--accent) / 0.35), transparent 42%, transparent 58%, hsl(var(--primary) / 0.35))",
                  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  padding: "1px",
                }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative z-10 max-w-2xl mx-auto text-center space-y-3">
                <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-primary-foreground leading-[1.08] tracking-tight">
                  Pare de ser invisível para as IAs.
                  <span className="block text-gradient mt-1">Domine sua categoria.</span>
                </h3>

                <ul className="grid gap-2 sm:grid-cols-2 max-w-xl mx-auto text-left">
                  {[
                    "Monitoramento contínuo nas 5 principais IAs",
                    "Alertas quando concorrentes te ultrapassam",
                    "Plano de ação personalizado por pilar",
                    "Benchmark competitivo no seu setor",
                    "E muito mais para sua marca ficar no topo nas IAs",
                  ].map((item, index) => (
                    <li
                      key={item}
                      className={`flex items-start gap-2 rounded-xl border border-primary-foreground/10 bg-primary-foreground/10 px-3 py-2 text-xs sm:text-[13px] text-primary-foreground/90 ${index === 4 ? "sm:col-span-2" : ""}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {["Diagnóstico grátis", "Sem cartão para começar", "Cancele quando quiser"].map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400 text-emerald-950 border border-emerald-300 shadow-[0_4px_14px_-2px_hsl(150_80%_45%/0.55)] text-[11px] sm:text-xs font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> {label}
                    </span>
                  ))}
                </div>

                <div className="pt-1 space-y-1.5">
                  <Button
                    size="lg"
                    className="group w-full h-11 sm:h-12 bg-primary-foreground hover:bg-primary-foreground text-primary hover:text-primary font-bold text-sm sm:text-[15px] rounded-xl shadow-[0_12px_36px_-16px_hsl(var(--primary-foreground)/0.7)] hover:shadow-[0_16px_40px_-16px_hsl(var(--primary-foreground)/0.8)] hover:scale-[1.01] transition-all duration-300 gap-2.5"
                    onClick={() => goToSignup("criar_conta")}
                  >
                    Criar minha conta — é grátis
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                  <button
                    type="button"
                    onClick={() => navigate(`/auth?mode=login&email=${encodeURIComponent(leadData.email)}`)}
                    className="inline-flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-primary-foreground/75 hover:text-primary-foreground transition-colors underline-offset-4 hover:underline"
                  >
                    <Unlock className="w-3 h-3" />
                    Já sou cliente — Entrar
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatedSection>
        )}

        {/* Gate movido para logo abaixo do score (card sticky inline) */}


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

            {dynamicPillarDetails.map((pillar, idx) => {
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
                          {pillar.hasData === false ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wider bg-muted text-muted-foreground border-border">
                              Sem dados
                            </span>
                          ) : (
                            <>
                              <div className="flex items-baseline gap-2">
                                {(() => {
                                  const band = getScoreBand(pillar.score);
                                  const bandClass =
                                    band.color === "red"
                                      ? "bg-red-50 text-red-700 border-red-200/60"
                                      : band.color === "amber"
                                      ? "bg-amber-50 text-amber-700 border-amber-200/60"
                                      : band.color === "blue"
                                      ? "bg-sky-50 text-sky-700 border-sky-200/60"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200/60";
                                  return (
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${bandClass}`}>
                                      {band.label}
                                    </span>
                                  );
                                })()}
                                <span className="text-2xl font-display font-bold text-foreground">{pillar.score}</span>
                                <span className="text-xs text-muted-foreground">/100</span>
                              </div>
                              <div className="h-2 w-36 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                  className={`h-full rounded-full ${barColor}`}
                                  initial={{ width: 0 }}
                                  whileInView={{ width: `${pillar.score}%` }}
                                  viewport={{ once: true }}
                                  transition={{ duration: 1.2, ease: "easeOut" }}
                                />
                              </div>
                            </>
                          )}
                        </div>

                      </div>

                      {/* Sub-criterio details intentionally reserved for the executive dashboard */}

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

            {/* ── CTA Tensão — fechamento ── */}
            <AnimatedSection delay={0.5}>
              <div className="rounded-2xl border border-primary/20 bg-ivero-gradient-soft p-10 text-center space-y-5">
                <p className="text-2xl sm:text-3xl font-display font-bold text-foreground max-w-2xl mx-auto leading-tight">
                  Escolha o plano certo para sua marca virar referência.
                </p>
                <Button
                  size="lg"
                  className="h-12 px-8 bg-ivero-gradient hover:opacity-90 text-primary-foreground font-bold text-base rounded-full shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.45)]"
                  onClick={() => goToSignup("cta_tensao_preview")}
                >
                  Quero garantir meu plano agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </AnimatedSection>

            {/* ── Diagnóstico Final ── */}
            <AnimatedSection delay={0.54}>
              <PremiumCard glow>
                <div className="space-y-4">
                  <SectionHeader icon={Brain} title="Diagnóstico Final" subtitle="A análise mais importante sobre o futuro da sua marca em IA" />
                  {(() => {
                    const sorted = [...dynamicRadarData].sort((a, b) => a.value - b.value);
                    const weakest1 = sorted[0]?.subject || "Autoridade";
                    const weakest2 = sorted[1]?.subject || "Conversão";
                    return (
                      <div className="space-y-3">
                        <p className="text-sm text-foreground leading-relaxed font-medium">
                          {geoScore <= 40
                            ? "Sua marca está praticamente invisível para as IAs generativas. Isso significa que quando potenciais clientes perguntam sobre soluções do seu mercado, sua empresa não aparece nas respostas."
                            : geoScore <= 70
                            ? "Sua marca tem presença parcial nas IAs, mas ainda não é referência. Alguns modelos a reconhecem, enquanto outros a ignoram completamente."
                            : "Sua marca já tem forte presença nas IAs generativas. A maioria dos modelos a reconhece e recomenda quando questionados sobre o seu mercado."}
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          Os pilares de <strong>{weakest1}</strong> e <strong>{weakest2}</strong> são os que mais limitam sua capacidade de ser
                          recomendado. Enquanto seus concorrentes investem nesses pontos, sua marca perde mercado de forma invisível.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </PremiumCard>
            </AnimatedSection>

            {/* ── Plano de Ação (bloqueado + watermark) ── */}
            <AnimatedSection delay={0.56}>
              <PremiumCard glow>
                <div className="space-y-5">
                  <SectionHeader
                    icon={Rocket}
                    title="Plano de Ação Recomendado"
                    subtitle="Roteiro estratégico personalizado — disponível após contratação"
                  />
                  <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-muted/20 select-none">
                    {/* Conteúdo borrado (amostra) */}
                    <div
                      aria-hidden
                      className="p-6 space-y-4 blur-[6px] pointer-events-none"
                      style={{
                        WebkitUserSelect: "none",
                        userSelect: "none",
                      }}
                      onCopy={(e) => e.preventDefault()}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {[
                        { t: "Reescrever headline e proposta de valor", d: "Aplicar fórmula de clareza GEO para que IAs identifiquem instantaneamente seu core business." },
                        { t: "Estruturar página de autoridade técnica", d: "Construir hub de conteúdo aprofundado com sinais de E-E-A-T para indexação por LLMs." },
                        { t: "Criar landing pages para tráfego de IA", d: "Páginas otimizadas com contexto, prova social e CTA assertivo para visitantes vindos de respostas generativas." },
                        { t: "Conquistar menções em mídia especializada", d: "Plano de PR digital direcionado às fontes que alimentam treinamento e RAG dos principais modelos." },
                        { t: "Implementar marcação semântica e schema", d: "Schema.org, FAQ e dados estruturados para que IAs interpretem corretamente seu posicionamento." },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-ivero-gradient text-primary-foreground text-xs font-bold shrink-0">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.t}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.d}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Watermark diagonal repetido */}
                    <div
                      aria-hidden
                      className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.10] mix-blend-multiply"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(-30deg, transparent 0 80px, rgba(0,0,0,0.0) 80px 160px)",
                      }}
                    >
                      <div className="absolute inset-0 flex flex-wrap content-around justify-around gap-8 -rotate-[20deg] scale-150">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <span
                            key={i}
                            className="text-[10px] sm:text-xs font-display font-bold text-primary whitespace-nowrap tracking-widest"
                          >
                            IVERO • AMOSTRA CONFIDENCIAL • NÃO COPIAR
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Overlay de bloqueio com CTA */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-background/40 via-background/70 to-background/95">
                      <div className="text-center space-y-4 px-6 max-w-md">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-ivero-gradient shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.55)]">
                          <Lock className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h4 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight">
                          Plano de ação completo bloqueado
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Liberamos o roteiro detalhado, cronograma e priorização exclusivamente para clientes contratantes.
                        </p>
                        <Button
                          size="lg"
                          className="h-12 px-7 bg-ivero-gradient hover:opacity-90 text-primary-foreground font-bold rounded-full shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.45)]"
                          onClick={() => goToSignup("plano_acao_locked")}
                        >
                          <Unlock className="mr-2 w-4 h-4" />
                          Desbloquear plano de ação
                        </Button>
                        <p className="text-[11px] text-muted-foreground/80">
                          Conteúdo protegido por direitos autorais — Ivero © {new Date().getFullYear()}
                        </p>
                      </div>
                    </div>
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
                </div>
              </PremiumCard>
            </AnimatedSection>

            {/* ── CTA Proposta Comercial ── */}
            <AnimatedSection delay={0.7}>
              <div className="relative rounded-2xl bg-ivero-gradient p-8 sm:p-10 text-center space-y-5 shadow-[0_12px_48px_-12px_hsl(var(--primary)/0.45)] max-w-2xl mx-auto">
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-primary-foreground leading-tight">
                  Com base no seu diagnóstico, geramos um plano comercial sob medida
                </h3>
                <Button
                  size="lg"
                  className="h-14 px-8 text-base font-bold bg-white text-primary hover:bg-white/90 rounded-full shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.55)]"
                  onClick={async () => {
                    try {
                      const radar = dynamicRadarData;
                      const { data, error } = await supabase.functions.invoke("gerar-proposta-from-preview", {
                        body: {
                          empresa_nome: extractBrandFromUrl(siteUrl),
                          empresa_site: siteUrl,
                          contato_nome: leadData?.name || null,
                          contato_email: leadData?.email || null,
                          contato_telefone: leadData?.phone || null,
                          origem: "preview",
                          score_geral: scoreForRecords,
                          diagnostico_snapshot: {
                            radar,
                            pillarDetails: dynamicPillarDetails,
                            aiEngines,
                            siteUrl,
                          },
                        },
                      });
                      if (error || !data?.slug) {
                        toast({ title: "Erro", description: error?.message || "Falha ao gerar proposta", variant: "destructive" });
                        return;
                      }
                      navigate(`/propostacomercial/${data.slug}`);
                    } catch (e: any) {
                      toast({ title: "Erro", description: e?.message || "Erro ao gerar proposta", variant: "destructive" });
                    }
                  }}
                >
                  Ver minha proposta personalizada
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </AnimatedSection>

            {/* Final gradient CTA removido — proposta personalizada acima é o fechamento. */}
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ── Extract brand name from URL ── */
function extractBrandFromUrl(url: string): string {
  try {
    let clean = url.replace(/^https?:\/\//, "").replace(/^www\./, "");
    clean = clean.split("/")[0].split(".")[0];
    return clean || "marca";
  } catch {
    return "marca";
  }
}

/* ── URL normalization + validation ── */
// Accepts "marca.com.br", "www.marca.com", "https://marca.com/sub" etc.
// Rejects emails, IPs, localhost, missing TLD, invalid characters.
function normalizeAndValidateUrl(raw: string): { ok: true; url: string } | { ok: false; reason: string } {
  let v = raw.trim().toLowerCase();
  if (!v) return { ok: false, reason: "Informe o site da sua marca." };
  if (v.includes("@")) return { ok: false, reason: "Insira uma URL, não um e-mail." };
  if (v.includes(" ")) return { ok: false, reason: "URLs não podem conter espaços." };

  // Strip protocol + path/query for hostname validation
  v = v.replace(/^https?:\/\//, "");
  const host = v.split(/[/?#]/)[0];

  if (!host) return { ok: false, reason: "URL inválida." };
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return { ok: false, reason: "Use o domínio público da sua marca." };
  }
  // Domain regex: labels separated by dots + TLD with 2+ letters
  const domainRegex = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  if (!domainRegex.test(host)) {
    return { ok: false, reason: "Domínio inválido (ex: suamarca.com.br)." };
  }
  return { ok: true, url: `https://${v}` };
}

/* ── Pre-scan modal: ask the URL before starting the audit when missing ── */
function PreScanUrlModal({ open, onSubmit }: { open: boolean; onSubmit: (url: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const result = normalizeAndValidateUrl(value);
    if (result.ok === false) {
      setError(result.reason);
      return;
    }
    setError(null);
    setSubmitting(true);
    const finalUrl = result.url;
    // Brief feedback delay so the user perceives the transition into the scanner
    setTimeout(() => onSubmit(finalUrl), 700);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-lg border-primary/20 bg-card"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ivero-gradient">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <DialogTitle className="font-display text-xl">
              {submitting ? "Preparando sua auditoria…" : "Antes de começar a auditoria"}
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {submitting
              ? "Conectando aos modelos de IA. A análise vai iniciar automaticamente."
              : "Informe o site da sua marca. Vamos investigar como ChatGPT, Gemini e Google Modo IA enxergam você."}
          </p>
        </DialogHeader>

        {submitting ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{value}</p>
                <p className="text-xs text-muted-foreground">Iniciando varredura nas IAs…</p>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 bg-ivero-gradient animate-[shimmer_1.2s_ease-in-out_infinite]" style={{ animation: "preScanShimmer 1.2s ease-in-out infinite" }} />
            </div>
            <style>{`@keyframes preScanShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div>
              <Input
                autoFocus
                type="text"
                inputMode="url"
                placeholder="ex: suamarca.com.br"
                value={value}
                onChange={handleChange}
                aria-invalid={!!error}
                className={`h-12 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {error && (
                <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>
              )}
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full h-12">
              Iniciar auditoria
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}


/* ── Main Page ── */
export default function PreviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const siteUrl = searchParams.get("url") || "";
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [aiEngines, setAiEngines] = useState<AIEngineResult[]>(defaultAiEngines);
  const [geoScore, setGeoScore] = useState(0);
  const [dynamicRadarData, setDynamicRadarData] = useState([
    { subject: "Clareza", value: 0, fullMark: 100 },
    { subject: "Autoridade", value: 0, fullMark: 100 },
    { subject: "Conversão", value: 0, fullMark: 100 },
    { subject: "Posicionamento", value: 0, fullMark: 100 },
    { subject: "Relevância", value: 0, fullMark: 100 },
  ]);
  const [dynamicPillarDetails, setDynamicPillarDetails] = useState<any[]>([]);
  const [allModelsFailed, setAllModelsFailed] = useState(false);
  const [failureSummary, setFailureSummary] = useState<Array<{ model: string; errorMessage: string }>>([]);
  const [partialFailures, setPartialFailures] = useState(0);
  const [totalModels, setTotalModels] = useState(0);
  const [retryToken, setRetryToken] = useState(0);


  // Funnel step 1.5: preview page viewed. Tracks landing on /preview with or
  // without a pre-filled site, so we can compute hero_cta_clicked → preview_view rate.
  useEffect(() => {
    track("preview_view", {
      has_site: !!siteUrl,
      site: siteUrl || null,
      came_from_hero: !!searchParams.get("name"), // hero form sets name; quick CTA does not
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!siteUrl) return; // wait for the modal submission
    const totalDuration = 10000; // ~10s teatro de loading; cliente precisa de tempo para ler as frases
    const stepDuration = totalDuration / loadingSteps.length;

    let apiDone = false;
    let minTimeDone = false;
    const tryFinish = () => {
      if (apiDone && minTimeDone) {
        setProgress(100);
        setCurrentStep(loadingSteps.length - 1);
        setTimeout(() => setLoading(false), 400);
      }
    };

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + 95 / (totalDuration / 50);
      });
    }, 50);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev >= loadingSteps.length - 1 ? prev : prev + 1));
    }, stepDuration);

    // Single call per model returns all 5 pillars (mode: diagnostico)
    const brandName = extractBrandFromUrl(siteUrl);
    const pillarKeys: { key: string; name: string }[] = [
      { key: "clareza", name: "Clareza" },
      { key: "autoridade", name: "Autoridade" },
      { key: "conversao", name: "Conversão" },
      { key: "posicionamento", name: "Posicionamento" },
      { key: "relevancia", name: "Relevância" },
    ];

    // Falha total controlada por variável local (o state do closure ficaria stale).
    let totalFailure = false;
    let gotRealScore = false;

    const callSimulateAi = async () => {
      const body = {
        prompt: `Avalie a marca "${brandName}" com base nas informações públicas disponíveis sobre seu site e presença digital.`,
        brandName,
        mode: "diagnostico",
      };
      const first = await supabase.functions.invoke("simulate-ai", { body });
      // Retry automático 1x apenas para falha de transporte/timeout (sem payload utilizável).
      if (first.error || !first.data?.results) {
        console.warn("simulate-ai transport failure, retrying once in 2s:", first.error);
        await new Promise((r) => setTimeout(r, 2000));
        return await supabase.functions.invoke("simulate-ai", { body });
      }
      return first;
    };

    const fetchAllPillars = async () => {
      try {
        const { data, error } = await callSimulateAi();

        if (error || !data?.results) {
          console.error("Diagnostico call failed:", error);
          totalFailure = true;
          setFailureSummary([
            { model: "simulate-ai", errorMessage: error?.message || "Sem resposta da análise (timeout ou indisponibilidade)." },
          ]);
          return;
        }

        // Falha total declarada pela edge function: todos os modelos retornaram erro.
        if (data.allModelsFailed) {
          totalFailure = true;
          setFailureSummary(Array.isArray(data.errorSummary) ? data.errorSummary : []);
          return;
        }

        const modelResults: any[] = data.results;
        const partial = modelResults.filter((r: any) => r?.error === true).length;
        setPartialFailures(partial);
        setTotalModels(modelResults.length);
        setAllModelsFailed(false);

        // Build per-pillar aggregation
        const results: PillarAnalysis[] = pillarKeys.map(({ key, name }) => {
          const aiDetails = modelResults.map((r) => {
            const pillar = r.pillars?.[key];
            const score = !r.error && typeof pillar?.score === "number" ? pillar.score : 0;
            const justificativa = pillar?.justificativa || (r.errorMessage ?? "");
            return {
              model: r.model,
              mentioned: !r.error && score >= 50,
              score,
              justificativa,
            };
          });

          // Somente modelos que responderam E trouxeram score numérico para este pilar
          const validScores = modelResults
            .filter((m) => !m.error && typeof m.pillars?.[key]?.score === "number")
            .map((m) => m.pillars[key].score as number);
          const hasData = validScores.length > 0;
          const avgScore = hasData
            ? Math.round(validScores.reduce((s, v) => s + v, 0) / validScores.length)
            : 0;

          const mentions = aiDetails.filter((a) => a.mentioned).length;

          // Aggregate criterios across models (average score per criterion index, keep nome+peso from first valid)
          const validModelPillars = modelResults
            .filter((m) => !m.error && Array.isArray(m.pillars?.[key]?.criterios))
            .map((m) => m.pillars[key].criterios as Array<{ nome: string; score: number; peso: number; justificativa?: string }>);

          let criterios: PillarCriterion[] = [];
          if (validModelPillars.length > 0) {
            const numCriterios = Math.min(3, ...validModelPillars.map((arr) => arr.length));
            for (let i = 0; i < numCriterios; i++) {
              const ref = validModelPillars.find((arr) => arr[i])?.[i];
              if (!ref) continue;
              const scores = validModelPillars.map((arr) => arr[i]?.score).filter((s) => typeof s === "number");
              const avg = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
              const CONVERGENCE_TOLERANCE = 15;
              const agree = scores.filter((s) => Math.abs(s - avg) <= CONVERGENCE_TOLERANCE).length;
              const consenso = { agree, total: scores.length };
              const justificativas = validModelPillars
                .map((arr) => arr[i]?.justificativa)
                .filter((j): j is string => typeof j === "string" && j.trim().length > 0);
              const justificativa = justificativas.sort((a, b) => b.length - a.length)[0];
              criterios.push({ nome: ref.nome, score: avg, peso: ref.peso, justificativa, consenso });
            }
          }

          return {
            name,
            mentions,
            score: avgScore,
            radarValue: avgScore,
            hasData,
            criterios,
            aiDetails,
          };
        });

        // Score geral = média apenas dos pilares que realmente têm dado de modelo.
        const scoredPillars = results.filter((r) => r.hasData);
        if (scoredPillars.length === 0) {
          // Resposta chegou, mas nenhum pilar utilizável: falha honesta, sem número.
          totalFailure = true;
          setFailureSummary(
            modelResults
              .filter((r: any) => r?.error)
              .map((r: any) => ({ model: r.model, errorMessage: r.errorMessage || "Resposta incompleta." }))
          );
          return;
        }
        const totalScore = Math.round(
          scoredPillars.reduce((sum, r) => sum + r.radarValue, 0) / scoredPillars.length
        );
        gotRealScore = true;
        setGeoScore(totalScore);

        // Radar mostra apenas pilares com leitura real (0 seria uma afirmação falsa).
        const radar = scoredPillars.map((r) => ({ subject: r.name, value: r.radarValue, fullMark: 100 }));
        setDynamicRadarData(radar);

        const details = buildPillarDetails(results);
        setDynamicPillarDetails(details);


        const keywordCloud = Array.isArray(data.keyword_cloud) ? data.keyword_cloud : [];
        try {
          sessionStorage.setItem(
            "ivero:lastDiagnostic",
            JSON.stringify({
              siteUrl,
              geoScore: totalScore,
              radar,
              pillarDetails: details,
              keyword_cloud: keywordCloud,
              savedAt: new Date().toISOString(),
            })
          );
          sessionStorage.removeItem("ivero:audit_adopted");
        } catch {
          /* storage may be unavailable (private mode); ignore */
        }

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("audit_reports").insert({
              user_id: user.id,
              source: "preview",
              site_url: siteUrl,
              overall_score: totalScore,
              status_label: "",
              radar_data: radar,
              pillar_details: details,
              keyword_cloud: keywordCloud,
              ai_engines: [],
            } as never);
            sessionStorage.setItem("ivero:audit_adopted", "1");
          }
        } catch (e) {
          console.warn("Audit persistence skipped:", e);
        }

        const engines: AIEngineResult[] = modelResults.map((r) => {
          if (r.error) {
            return { name: r.model, found: false, error: true, errorMessage: r.errorMessage };
          }
          const scores = pillarKeys.map((p) => r.pillars?.[p.key]?.score || 0);
          const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
          return { name: r.model, found: avg >= 50 };
        });
        setAiEngines(engines);
      } catch (e) {
        console.error("Pillar analysis failed:", e);
        totalFailure = true;
        setFailureSummary([
          { model: "simulate-ai", errorMessage: e instanceof Error ? e.message : "Erro inesperado na análise." },
        ]);
      } finally {
        // Nenhum score é fabricado. Sem resultado real => tela de erro honesta.
        if (!gotRealScore || totalFailure) {
          setGeoScore(0);
          setDynamicRadarData([]);
          setDynamicPillarDetails([]);
          setAiEngines(defaultAiEngines);
          setAllModelsFailed(true);
        }
        apiDone = true;
        tryFinish();
      }

    };

    fetchAllPillars();

    const timeout = setTimeout(() => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      minTimeDone = true;
      tryFinish();
    }, totalDuration);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearTimeout(timeout);
    };
  }, [siteUrl, retryToken]);

  if (!siteUrl) {
    return (
      <PreScanUrlModal
        open
        onSubmit={(url) => {
          const next = new URLSearchParams(searchParams);
          next.set("url", url);
          setSearchParams(next, { replace: true });
        }}
      />
    );
  }
  if (loading) return <LoadingScreen currentStep={currentStep} progress={progress} />;
  if (allModelsFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6 py-16">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Não foi possível concluir a análise agora
          </h1>
          <p className="text-base text-gray-600 leading-relaxed">
            Estamos com instabilidade temporária nos provedores de IA. Nenhum modelo conseguiu responder no momento. Tente novamente em alguns minutos.
          </p>
          {failureSummary.length > 0 && (
            <details className="text-left text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <summary className="cursor-pointer font-medium text-gray-700">Detalhes técnicos ({failureSummary.length} modelos)</summary>
              <ul className="mt-2 space-y-1">
                {failureSummary.map((f, i) => (
                  <li key={i}><span className="font-mono text-gray-700">{f.model}</span>: {f.errorMessage}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              onClick={() => {
                setAllModelsFailed(false);
                setFailureSummary([]);
                setLoading(true);
                setProgress(0);
                setCurrentStep(0);
                setGeoScore(0);
                setRetryToken((t) => t + 1);
              }}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Voltar para o início
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      {partialFailures > 0 && totalModels > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2 text-center">
          {partialFailures} de {totalModels} modelos indisponíveis no momento — score calculado apenas com os que responderam.
        </div>
      )}
      <DiagnosticReport siteUrl={siteUrl} aiEngines={aiEngines} geoScore={geoScore} scoreIsReal={geoScore > 0} dynamicRadarData={dynamicRadarData} dynamicPillarDetails={dynamicPillarDetails} />

    </>
  );
}
