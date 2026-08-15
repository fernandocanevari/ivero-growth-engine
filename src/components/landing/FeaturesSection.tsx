import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, GitCompare, TrendingUp, Shield, FileText, Bell, ChevronLeft, ChevronRight, Map, BarChart3, FlaskConical, Search } from "lucide-react";
import { FEATURES } from "@/content/landing";

const AUTOPLAY_INTERVAL = 6000;
const CARDS_PER_VIEW = { desktop: 3, tablet: 2, mobile: 1 };

const FEATURE_ICONS: Record<string, typeof Bot> = {
  monitoring: Bot,
  compare: GitCompare,
  score: TrendingUp,
  sentiment: Shield,
  actions: FileText,
  alerts: Bell,
  prompts: Map,
  dominance: BarChart3,
  simulator: FlaskConical,
};

const features = FEATURES.items.map((item) => ({
  ...item,
  icon: FEATURE_ICONS[item.key],
  mockup: item.key,
}));

/* ── Mockups ── */

const MonitoringMockup = () => (
  <div className="grid grid-cols-2 gap-2.5 w-full">
    {[
      { name: "ChatGPT", mentions: 142 },
      { name: "Gemini", mentions: 89 },
      { name: "Google Modo IA", mentions: 67 },
    ].map((ai) => {
      const color = ai.mentions >= 100 ? "text-emerald-500" :
                    ai.mentions >= 70 ? "text-emerald-400" :
                    ai.mentions >= 50 ? "text-amber-400" :
                    "text-destructive";
      const dot = ai.mentions >= 100 ? "bg-emerald-500" :
                  ai.mentions >= 70 ? "bg-emerald-400" :
                  ai.mentions >= 50 ? "bg-amber-400" :
                  "bg-destructive";
      return (
        <div key={ai.name} className="p-3 rounded-lg bg-ivero-card-inner">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground">{ai.name}</span>
            <div className={`w-2 h-2 rounded-full ${dot}`} />
          </div>
          <span className={`text-xl font-bold ${color}`}>{ai.mentions}</span>
          <span className="text-[10px] text-muted-foreground ml-1">menções</span>
        </div>
      );
    })}
    <div className="p-3 rounded-lg bg-ivero-card-inner border border-dashed border-muted-foreground/30">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">Claude • Perplexity • GPT-5</span>
        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
      </div>
      <span className="text-xs font-semibold text-muted-foreground">Em breve</span>
    </div>
  </div>
);


const CompareMockup = () => {
  const barColor = (pct: number) =>
    pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-destructive";
  return (
    <div className="w-full space-y-3">
      {[
        { name: "Sua marca", pct: 78 },
        { name: "Concorrente A", pct: 52 },
        { name: "Concorrente B", pct: 34 },
      ].map((item) => (
        <div key={item.name} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-foreground font-medium">{item.name}</span>
            <span className="text-muted-foreground">{item.pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${barColor(item.pct)}`}
              style={{ width: `${item.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

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
      <span>+12 pts</span>
    </div>
  </div>
);

const SentimentMockup = () => (
  <div className="w-full space-y-3">
    <div className="h-4 rounded-full overflow-hidden flex gap-0.5">
      <div className="bg-emerald-500 rounded-l-full" style={{ width: "62%" }} />
      <div className="bg-amber-400" style={{ width: "25%" }} />
      <div className="bg-destructive rounded-r-full" style={{ width: "13%" }} />
    </div>
    <div className="flex justify-between text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />62 %</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />25 %</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive inline-block" />13 %</span>
    </div>
  </div>
);

const ActionsMockup = () => (
  <div className="w-full space-y-2">
    {[
      { action: "Criar artigo sobre IA generativa", priority: "Alta", checked: true },
      { action: "Otimizar FAQ do site", priority: "Alta", checked: true },
      { action: "Atualizar página 'Sobre'", priority: "Média", checked: false },
    ].map((item, i) => (
      <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-ivero-card-inner text-xs">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
          item.checked ? "bg-emerald-500/15" : "border border-muted-foreground/30"
        }`}>
          {item.checked && <span className="text-emerald-500 text-[10px]">✓</span>}
        </div>
        <span className="flex-1 text-foreground">{item.action}</span>
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
      { msg: "Queda de visibilidade no Gemini", type: "alert", label: "Alerta", time: "2 min" },
      { msg: "Novo concorrente no ChatGPT", type: "alert", label: "Alerta", time: "15 min" },
      { msg: "Sentimento positivo +72%", type: "info", label: "Informações", time: "1h" },
    ].map((alert, i) => (
      <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-ivero-card-inner text-xs">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
          alert.type === "alert" ? "bg-amber-400/15" : "bg-sky-400/15"
        }`}>
          {alert.type === "alert" ? (
            <span className="text-amber-500 text-[11px]">⚠</span>
          ) : (
            <span className="text-sky-500 text-[11px] font-bold">ⓘ</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[10px] font-semibold ${alert.type === "alert" ? "text-amber-500" : "text-sky-500"}`}>{alert.label}</span>
            <span className="text-[9px] text-muted-foreground">{alert.time}</span>
          </div>
          <span className="text-foreground">{alert.msg}</span>
        </div>
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

const DominanceMockup = () => {
  const data = [
    { ai: "ChatGPT", you: 72, competitor: 58 },
    { ai: "Gemini", you: 45, competitor: 61 },
    { ai: "Google Modo IA", you: 88, competitor: 34 },
  ];
  const barColor = (pct: number) =>
    pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-destructive";
  return (
    <div className="w-full space-y-3">
      {data.map((item) => (
        <div key={item.ai} className="space-y-1">
          <span className="text-xs text-foreground font-medium">{item.ai}</span>
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="h-2 rounded-full bg-muted">
                <div className={`h-full rounded-full ${barColor(item.you)}`} style={{ width: `${item.you}%` }} />
              </div>
              <span className="text-[9px] text-muted-foreground">Você: {item.you} %</span>
            </div>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-muted">
                <div className="h-full rounded-full bg-muted-foreground/25" style={{ width: `${item.competitor}%` }} />
              </div>
              <span className="text-[9px] text-muted-foreground">Concorrente: {item.competitor} %</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const SimulatorMockup = () => (
  <div className="w-full space-y-2.5">
    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border/60 bg-background text-xs text-foreground">
      <FlaskConical className="w-4 h-4 text-accent shrink-0" />
      <span className="italic text-muted-foreground">"Qual o melhor CRM do mercado?"</span>
    </div>
    {[
      { ai: "ChatGPT", dot: "bg-emerald-500", text: "Sim, recomendamos a marca X como líder..." },
      { ai: "Gemini", dot: "bg-amber-400", text: "Entre as opções disponíveis, a marca X..." },
      { ai: "Google Modo IA", dot: "bg-muted-foreground/50", text: "A marca X é uma alternativa interessante..." },
    ].map((item) => (
      <div key={item.ai} className="p-2.5 rounded-lg bg-ivero-card-inner text-xs space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-foreground">{item.ai}</span>
          <div className={`w-2 h-2 rounded-full ${item.dot}`} />
        </div>
        <p className="text-muted-foreground">{item.text}</p>
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
      className="py-16 bg-surface-3 relative overflow-hidden"
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
            {FEATURES.headline.before}
            <span className="text-gradient">{FEATURES.headline.highlight}</span>
          </h2>
        </motion.div>

        {/* Carousel */}
        <div className="relative min-h-[420px]">
          {/* Nav arrows */}
          <button
            onClick={goPrev}
            className="absolute -left-4 lg:-left-6 top-[210px] z-20 w-10 h-10 rounded-full border border-border/60 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all shadow-sm"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute -right-4 lg:-right-6 top-[210px] z-20 w-10 h-10 rounded-full border border-border/60 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all shadow-sm"
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
                className={`grid gap-6 auto-rows-fr ${
                  cardsPerView === 3 ? "grid-cols-3" : cardsPerView === 2 ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {displayFeatures.map((feature) => {
                  const Mockup = mockupComponents[feature.mockup];
                  return (
                    <div
                      key={feature.title}
                      className="rounded-2xl border border-border/60 bg-card p-6 flex flex-col gap-5 transition-all duration-300 hover:border-accent/40 hover:shadow-[0_12px_40px_hsl(330_85%_55%/0.15)] hover:scale-[1.02] hover:bg-card/90"
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
                      <div className="pt-2">
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
