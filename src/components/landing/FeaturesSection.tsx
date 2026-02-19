import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, GitCompare, TrendingUp, Shield, FileText, Bell, ChevronLeft, ChevronRight, Map, BarChart3, FlaskConical, Search } from "lucide-react";

const AUTOPLAY_INTERVAL = 6000;
const CARDS_PER_VIEW = { desktop: 3, tablet: 2, mobile: 1 };

const features = [
  {
    icon: Bot,
    title: "Monitoramento Multi-IA",
    description: "Rastreie menções da sua marca no ChatGPT, Gemini, Perplexity, Claude e outros motores generativos.",
    mockup: "monitoring",
  },
  {
    icon: GitCompare,
    title: "Análise Comparativa",
    description: "Compare sua visibilidade com concorrentes diretos em cada motor de IA.",
    mockup: "compare",
  },
  {
    icon: TrendingUp,
    title: "Score de Visibilidade GEO",
    description: "Métrica proprietária de 0 a 100 que quantifica sua presença nas respostas de IA.",
    mockup: "score",
  },
  {
    icon: Shield,
    title: "Análise de Sentimento",
    description: "Entenda se a IA fala da sua marca de forma positiva, neutra ou negativa.",
    mockup: "sentiment",
  },
  {
    icon: FileText,
    title: "Planos de Ação Estratégicos",
    description: "Receba recomendações prescritivas para melhorar sua presença em IA.",
    mockup: "actions",
  },
  {
    icon: Bell,
    title: "Alertas em Tempo Real",
    description: "Seja notificado quando houver mudanças na forma como IAs citam sua marca.",
    mockup: "alerts",
  },
  {
    icon: Map,
    title: "Mapa de Prompts Estratégicos",
    description: "Descubra quais perguntas fazem sua marca aparecer — e quais não fazem.",
    mockup: "prompts",
  },
  {
    icon: BarChart3,
    title: "Dominância por Modelo de IA",
    description: "Compare sua visibilidade no ChatGPT, Gemini e Claude — lado a lado com seus concorrentes.",
    mockup: "dominance",
  },
  {
    icon: FlaskConical,
    title: "Simulador de Influência em IA",
    description: "Teste perguntas reais e veja como cada modelo responde sobre sua marca — em tempo real.",
    mockup: "simulator",
  },
];

/* ── Mockups ── */

const MonitoringMockup = () => (
  <div className="grid grid-cols-2 gap-2.5 w-full">
    {[
      { name: "ChatGPT", mentions: 142, status: "green" },
      { name: "Gemini", mentions: 89, status: "green" },
      { name: "Claude", mentions: 67, status: "yellow" },
      { name: "Perplexity", mentions: 31, status: "green" },
    ].map((ai) => (
      <div key={ai.name} className="p-3 rounded-lg bg-ivero-card-inner">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-foreground">{ai.name}</span>
          <div className={`w-2 h-2 rounded-full ${ai.status === "green" ? "bg-accent" : "bg-amber-400"}`} />
        </div>
        <span className="text-xl font-bold text-foreground">{ai.mentions}</span>
        <span className="text-[10px] text-muted-foreground ml-1">menções</span>
      </div>
    ))}
  </div>
);

const CompareMockup = () => (
  <div className="w-full space-y-3">
    {[
      { name: "Sua marca", pct: 78, highlight: true },
      { name: "Concorrente A", pct: 52 },
      { name: "Concorrente B", pct: 34 },
    ].map((item) => (
      <div key={item.name} className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className={item.highlight ? "text-foreground font-medium" : "text-muted-foreground"}>{item.name}</span>
          <span className="text-muted-foreground">{item.pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${item.highlight ? "bg-ivero-gradient" : "bg-muted-foreground/30"}`}
            style={{ width: `${item.pct}%` }}
          />
        </div>
      </div>
    ))}
  </div>
);

const ScoreMockup = () => (
  <div className="flex flex-col items-center gap-3 w-full">
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle
          cx="60" cy="60" r="50" fill="none"
          stroke="url(#scoreGradCarousel)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 50}
          strokeDashoffset={2 * Math.PI * 50 * (1 - 0.78)}
        />
        <defs>
          <linearGradient id="scoreGradCarousel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(265 70% 45%)" />
            <stop offset="100%" stopColor="hsl(330 85% 55%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">78</span>
        <span className="text-[10px] text-muted-foreground">/100</span>
      </div>
    </div>
    <div className="flex items-center gap-1 text-xs text-accent font-medium">
      <TrendingUp className="w-3 h-3" />
      <span>+12 pts</span>
    </div>
  </div>
);

const SentimentMockup = () => (
  <div className="w-full space-y-3">
    <div className="h-3 rounded-full overflow-hidden flex">
      <div className="bg-accent" style={{ width: "64%" }} />
      <div className="bg-muted-foreground/30" style={{ width: "28%" }} />
      <div className="bg-destructive" style={{ width: "8%" }} />
    </div>
    <div className="flex justify-between text-[10px] text-muted-foreground">
      <span>Positivo 64%</span>
      <span>Neutro 28%</span>
      <span>Negativo 8%</span>
    </div>
  </div>
);

const ActionsMockup = () => (
  <div className="w-full space-y-2">
    {[
      { action: "Criar artigo sobre IA generativa", priority: "Alta", done: false },
      { action: "Otimizar FAQ do site", priority: "Alta", done: false },
      { action: "Atualizar página 'Sobre'", priority: "Média", done: true },
    ].map((item, i) => (
      <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-ivero-card-inner text-xs">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
          item.done ? "bg-emerald-500/15" : "border border-muted-foreground/30"
        }`}>
          {item.done && <span className="text-emerald-500 text-[10px]">✓</span>}
        </div>
        <span className={`flex-1 ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.action}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold text-primary-foreground ${
          item.priority === "Alta" ? "bg-destructive" : "bg-amber-400"
        }`}>{item.priority}</span>
      </div>
    ))}
  </div>
);

const AlertsMockup = () => (
  <div className="w-full space-y-2">
    {[
      { msg: "Queda de visibilidade no Gemini", type: "alert" },
      { msg: "Novo concorrente no ChatGPT", type: "info" },
      { msg: "Sentimento positivo +72%", type: "info" },
    ].map((alert, i) => (
      <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-ivero-card-inner text-xs">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          alert.type === "alert" ? "bg-amber-400" : "bg-accent"
        }`} />
        <span className="text-foreground">{alert.msg}</span>
      </div>
    ))}
  </div>
);

const PromptsMockup = () => (
  <div className="w-full space-y-2">
    {[
      { prompt: "\"melhor ferramenta de CRM\"", rank: "#2" },
      { prompt: "\"software de vendas B2B\"", rank: "#1" },
      { prompt: "\"alternativa ao Salesforce\"", rank: "Ausente" },
      { prompt: "\"plataforma de gestão comercial\"", rank: "#4" },
    ].map((item, i) => (
      <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-ivero-card-inner text-xs">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
          item.rank === "#1" ? "bg-emerald-500/15" :
          item.rank === "#2" ? "bg-emerald-400/15" :
          item.rank === "#4" ? "bg-amber-400/15" :
          "bg-destructive/15"
        }`}>
          <Search className={`w-3 h-3 ${
            item.rank === "#1" ? "text-emerald-500" :
            item.rank === "#2" ? "text-emerald-400" :
            item.rank === "#4" ? "text-amber-400" :
            "text-destructive"
          }`} />
        </div>
        <span className="flex-1 text-foreground">{item.prompt}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full text-primary-foreground ${
          item.rank === "#1" ? "bg-emerald-500" :
          item.rank === "#2" ? "bg-emerald-400" :
          item.rank === "#4" ? "bg-amber-400" :
          "bg-destructive"
        }`}>{item.rank}</span>
      </div>
    ))}
  </div>
);

const DominanceMockup = () => (
  <div className="w-full space-y-2.5">
    {["ChatGPT", "Gemini", "Claude"].map((ai) => (
      <div key={ai} className="space-y-1">
        <span className="text-[10px] text-muted-foreground font-medium">{ai}</span>
        <div className="flex gap-1.5">
          <div className="flex-1 space-y-0.5">
            <div className="h-2 rounded-full bg-ivero-gradient" style={{ width: `${ai === "ChatGPT" ? 75 : ai === "Gemini" ? 60 : 82}%` }} />
            <span className="text-[9px] text-accent">Sua marca</span>
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="h-2 rounded-full bg-muted-foreground/25" style={{ width: `${ai === "ChatGPT" ? 55 : ai === "Gemini" ? 70 : 40}%` }} />
            <span className="text-[9px] text-muted-foreground">Concorrente</span>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const SimulatorMockup = () => (
  <div className="w-full space-y-3">
    <div className="p-2 rounded-lg border border-accent/20 bg-accent/5 text-xs text-foreground">
      💬 "Qual a melhor marca de tênis para corrida?"
    </div>
    {["ChatGPT", "Gemini", "Claude"].map((ai) => (
      <div key={ai} className="p-2 rounded-lg bg-ivero-card-inner text-xs">
        <span className="font-medium text-foreground">{ai}:</span>
        <span className="text-muted-foreground ml-1">
          {ai === "ChatGPT" ? "\"Recomendo a Sua Marca pela tecnologia...\"" :
           ai === "Gemini" ? "\"Entre as opções, destaco Sua Marca...\"" :
           "\"Sua Marca é referência no segmento...\""}
        </span>
      </div>
    ))}
  </div>
);

const mockupComponents: Record<string, React.FC> = {
  monitoring: MonitoringMockup,
  compare: CompareMockup,
  score: ScoreMockup,
  sentiment: SentimentMockup,
  actions: ActionsMockup,
  alerts: AlertsMockup,
  prompts: PromptsMockup,
  dominance: DominanceMockup,
  simulator: SimulatorMockup,
};

const FeaturesSection = () => {
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const totalPages = features.length; // each dot = 1 feature offset

  // Responsive cards per view
  const getCardsPerView = () => {
    if (typeof window === "undefined") return CARDS_PER_VIEW.desktop;
    if (window.innerWidth >= 1024) return CARDS_PER_VIEW.desktop;
    if (window.innerWidth >= 768) return CARDS_PER_VIEW.tablet;
    return CARDS_PER_VIEW.mobile;
  };

  const [cardsPerView, setCardsPerView] = useState(getCardsPerView);

  useEffect(() => {
    const handleResize = () => setCardsPerView(getCardsPerView());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxPage = Math.max(0, totalPages - cardsPerView);

  const goNext = useCallback(() => {
    setPage((prev) => (prev >= maxPage ? 0 : prev + 1));
  }, [maxPage]);

  const goPrev = () => {
    setPage((prev) => (prev <= 0 ? maxPage : prev - 1));
  };

  // Autoplay
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(goNext, AUTOPLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [paused, goNext]);

  const visibleFeatures = features.slice(page, page + cardsPerView);
  // Handle wrap-around if needed
  const displayFeatures = visibleFeatures.length < cardsPerView
    ? [...visibleFeatures, ...features.slice(0, cardsPerView - visibleFeatures.length)]
    : visibleFeatures;

  return (
    <section
      className="py-16 bg-background relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container mx-auto px-6">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            Recursos da Ivero para{" "}
            <span className="text-gradient">a presença da sua marca nas IAs</span>
          </h2>
        </motion.div>

        {/* Carousel */}
        <div className="relative">
          {/* Nav arrows */}
          <button
            onClick={goPrev}
            className="absolute -left-4 lg:-left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-border/60 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all shadow-sm"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute -right-4 lg:-right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-border/60 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all shadow-sm"
            aria-label="Próximo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Cards */}
          <div className="overflow-hidden px-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className={`grid gap-6 ${
                  cardsPerView === 3 ? "grid-cols-3" : cardsPerView === 2 ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {displayFeatures.map((feature) => {
                  const Mockup = mockupComponents[feature.mockup];
                  return (
                    <div
                      key={feature.title}
                      className="rounded-2xl border border-border/60 bg-card p-6 flex flex-col gap-5 transition-all duration-300 hover:border-accent/20 hover:shadow-[0_8px_30px_hsl(330_85%_55%/0.06)]"
                    >
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-ivero-gradient flex items-center justify-center shrink-0">
                          <feature.icon className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-display text-base font-bold text-card-foreground leading-tight">
                            {feature.title}
                          </h3>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>

                      {/* Mockup */}
                      <div className="mt-auto pt-2">
                        <Mockup />
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: maxPage + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                page === i ? "w-6 bg-ivero-gradient" : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/40"
              }`}
              aria-label={`Ir para slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
