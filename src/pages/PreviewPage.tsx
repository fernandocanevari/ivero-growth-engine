import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Lock, Bot, GitCompare, TrendingUp, Shield, FileText,
  Bell, Map, BarChart3, FlaskConical, Search, Sparkles,
} from "lucide-react";

/* ── Feature definitions ── */
const features = [
  {
    icon: Bot,
    title: "Monitoramento Multi-IA",
    description: "Rastreie menções da sua marca no ChatGPT, Gemini, Perplexity, Claude e outros motores generativos.",
    unlocked: true,
  },
  {
    icon: TrendingUp,
    title: "Score de Visibilidade GEO",
    description: "Métrica proprietária de 0 a 100 que quantifica sua presença nas respostas de IA.",
    unlocked: true,
  },
  {
    icon: GitCompare,
    title: "Análise Comparativa",
    description: "Compare sua visibilidade com concorrentes diretos em cada motor de IA.",
    unlocked: true,
  },
  {
    icon: Shield,
    title: "Análise de Sentimento",
    description: "Entenda se a IA fala da sua marca de forma positiva, neutra ou negativa.",
    unlocked: false,
  },
  {
    icon: FileText,
    title: "Planos de Ação Estratégicos",
    description: "Receba recomendações prescritivas para melhorar sua presença em IA.",
    unlocked: false,
  },
  {
    icon: Bell,
    title: "Alertas em Tempo Real",
    description: "Seja notificado quando houver mudanças na forma como IAs citam sua marca.",
    unlocked: false,
  },
  {
    icon: Map,
    title: "Mapa de Prompts Estratégicos",
    description: "Descubra quais perguntas fazem sua marca aparecer — e quais não fazem.",
    unlocked: false,
  },
  {
    icon: BarChart3,
    title: "Dominância por Modelo de IA",
    description: "Compare sua visibilidade no ChatGPT, Gemini e Claude — lado a lado.",
    unlocked: false,
  },
  {
    icon: FlaskConical,
    title: "Simulador de Influência em IA",
    description: "Teste perguntas reais e veja como cada modelo responde sobre sua marca.",
    unlocked: false,
  },
];

/* ── Unlocked mockups ── */

const MonitoringMockup = () => (
  <div className="grid grid-cols-2 gap-2 w-full">
    {[
      { name: "ChatGPT", mentions: 142, color: "text-emerald-500", dot: "bg-emerald-500" },
      { name: "Gemini", mentions: 89, color: "text-emerald-400", dot: "bg-emerald-400" },
      { name: "Claude", mentions: 67, color: "text-amber-400", dot: "bg-amber-400" },
      { name: "Perplexity", mentions: 31, color: "text-destructive", dot: "bg-destructive" },
    ].map((ai) => (
      <div key={ai.name} className="p-3 rounded-lg bg-secondary/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-foreground">{ai.name}</span>
          <div className={`w-2 h-2 rounded-full ${ai.dot}`} />
        </div>
        <span className={`text-xl font-bold ${ai.color}`}>{ai.mentions}</span>
        <span className="text-[10px] text-muted-foreground ml-1">menções</span>
      </div>
    ))}
  </div>
);

const ScoreMockup = () => (
  <div className="flex flex-col items-center gap-3 w-full">
    <div className="relative w-24 h-24">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="url(#scoreGradPreview)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 50} strokeDashoffset={2 * Math.PI * 50 * (1 - 0.78)} />
        <defs>
          <linearGradient id="scoreGradPreview" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">78</span>
        <span className="text-[10px] text-muted-foreground">/100</span>
      </div>
    </div>
    <div className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
      <TrendingUp className="w-3 h-3" />
      <span>+12 pts este mês</span>
    </div>
  </div>
);

const CompareMockup = () => (
  <div className="w-full space-y-3">
    {[
      { name: "Sua marca", pct: 78, color: "bg-emerald-500" },
      { name: "Concorrente A", pct: 52, color: "bg-amber-400" },
      { name: "Concorrente B", pct: 34, color: "bg-destructive" },
    ].map((item) => (
      <div key={item.name} className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-foreground font-medium">{item.name}</span>
          <span className="text-muted-foreground">{item.pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
        </div>
      </div>
    ))}
  </div>
);

const mockups: Record<string, React.FC> = {
  "Monitoramento Multi-IA": MonitoringMockup,
  "Score de Visibilidade GEO": ScoreMockup,
  "Análise Comparativa": CompareMockup,
};

/* ── Page ── */

export default function PreviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const siteUrl = searchParams.get("url") || "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-xl font-display font-bold text-gradient">
            Ivero
          </button>
          <Button variant="hero" size="sm" onClick={() => navigate("/login")}>
            Criar conta grátis <ArrowRight className="ml-1 w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium">
            <Sparkles className="w-4 h-4" />
            Prévia da plataforma
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Veja o que a Ivero pode revelar{" "}
            {siteUrl && (
              <span className="text-gradient">sobre {siteUrl}</span>
            )}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Aqui estão 3 dos 9 módulos de inteligência. Crie sua conta para desbloquear todos.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => {
            const Mockup = mockups[feature.title];
            const isLocked = !feature.unlocked;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className={`relative rounded-2xl border p-6 flex flex-col gap-4 transition-all ${
                  isLocked
                    ? "border-border/40 bg-card/50"
                    : "border-border bg-card hover:border-accent/40 hover:shadow-lg"
                }`}
              >
                {/* Blur overlay for locked */}
                {isLocked && (
                  <div className="absolute inset-0 z-10 rounded-2xl bg-background/60 backdrop-blur-[6px] flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Disponível no plano completo
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isLocked ? "bg-muted" : "bg-ivero-gradient"
                  }`}>
                    <feature.icon className={`w-5 h-5 ${isLocked ? "text-muted-foreground" : "text-primary-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-card-foreground leading-tight">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                  </div>
                </div>

                {/* Mockup or placeholder */}
                <div className="flex-1 flex items-center justify-center min-h-[140px] rounded-xl bg-secondary/30 p-4">
                  {Mockup ? <Mockup /> : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="space-y-2 w-full">
                        <div className="h-3 rounded-full bg-muted w-3/4" />
                        <div className="h-3 rounded-full bg-muted w-1/2" />
                        <div className="h-3 rounded-full bg-muted w-5/6" />
                        <div className="h-3 rounded-full bg-muted w-2/3" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center space-y-5 py-10"
        >
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Gostou? Desbloqueie todos os <span className="text-gradient">9 módulos</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Crie sua conta gratuita e tenha acesso completo à plataforma de inteligência GEO mais completa do mercado.
          </p>
          <Button variant="hero" size="lg" className="text-base px-10 py-6" onClick={() => navigate("/login")}>
            Criar minha conta grátis
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
