import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, GitCompare, TrendingUp, Shield, FileText, Bell } from "lucide-react";

const AUTOPLAY_INTERVAL = 5000;

const features = [
  {
    icon: Bot,
    title: "Monitoramento Multi-IA",
    description: "Rastreie menções da sua marca no ChatGPT, Gemini, Perplexity, Claude e outros motores generativos simultaneamente.",
    bullets: [
      "Cobertura das principais IAs do mercado",
      "Consultas reais baseadas no seu setor",
      "Atualização contínua e automática",
    ],
    mockup: "monitoring",
  },
  {
    icon: GitCompare,
    title: "Análise Comparativa",
    description: "Compare sua visibilidade com concorrentes diretos. Saiba quem está sendo recomendado e por quê.",
    bullets: [
      "Ranking de visibilidade por IA",
      "Identificação de padrões de recomendação",
      "Benchmarking contra concorrentes diretos",
    ],
    mockup: "compare",
  },
  {
    icon: TrendingUp,
    title: "Score de Visibilidade GEO",
    description: "Métrica proprietária que quantifica o quão presente e bem posicionada sua marca está nas respostas de IA.",
    bullets: [
      "Índice unificado de 0 a 100",
      "Consolida frequência, posição e sentimento",
      "Acompanhamento de tendência ao longo do tempo",
    ],
    mockup: "score",
  },
  {
    icon: Shield,
    title: "Análise de Sentimento",
    description: "Entenda se a IA fala da sua marca de forma positiva, neutra ou negativa — e o que influencia esse tom.",
    bullets: [
      "Classificação positiva, neutra e negativa",
      "Mapeamento dos fatores de influência",
      "Evolução do sentimento ao longo do tempo",
    ],
    mockup: "sentiment",
  },
  {
    icon: FileText,
    title: "Planos de Ação Estratégicos",
    description: "Receba recomendações prescritivas de conteúdo, SEO e posicionamento para melhorar sua presença em IA.",
    bullets: [
      "Playbooks personalizados por setor",
      "Ações priorizadas por impacto",
      "Recomendações de conteúdo e SEO técnico",
    ],
    mockup: "actions",
  },
  {
    icon: Bell,
    title: "Alertas em Tempo Real",
    description: "Seja notificado quando houver mudanças na forma como IAs citam sua marca ou seus concorrentes.",
    bullets: [
      "Alertas por email ou webhook",
      "Mudanças de visibilidade e sentimento",
      "Novos concorrentes detectados",
    ],
    mockup: "alerts",
  },
];

/* ── Mockups ── */

const MonitoringMockup = () => (
  <div className="grid grid-cols-2 gap-3 w-full">
    {[
      { name: "ChatGPT", mentions: 47, status: "green" },
      { name: "Gemini", mentions: 32, status: "green" },
      { name: "Claude", mentions: 28, status: "yellow" },
      { name: "Perplexity", mentions: 19, status: "green" },
    ].map((ai, i) => (
      <motion.div
        key={ai.name}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: i * 0.1 }}
        className="p-4 rounded-xl bg-ivero-dark border border-ivero-purple/15 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-primary-foreground">{ai.name}</span>
          <div className={`w-2.5 h-2.5 rounded-full ${ai.status === "green" ? "bg-accent" : "bg-amber-400"}`} />
        </div>
        <div>
          <span className="text-2xl font-bold text-primary-foreground">{ai.mentions}</span>
          <span className="text-xs text-ivero-slate-light ml-1.5">menções</span>
        </div>
      </motion.div>
    ))}
  </div>
);

const CompareMockup = () => (
  <div className="w-full space-y-4">
    {[
      { name: "Sua Marca", pct: 82, highlight: true },
      { name: "Concorrente A", pct: 58 },
      { name: "Concorrente B", pct: 41 },
    ].map((item, i) => (
      <motion.div key={item.name} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }} className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className={item.highlight ? "text-accent font-semibold" : "text-primary-foreground"}>{item.name}</span>
          <span className="text-ivero-slate-light font-medium">{item.pct}%</span>
        </div>
        <div className="h-3 rounded-full bg-ivero-purple/15">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${item.pct}%` }}
            transition={{ delay: 0.2 + i * 0.12, duration: 0.7 }}
            className={`h-full rounded-full ${item.highlight ? "bg-ivero-gradient" : "bg-ivero-slate/40"}`}
          />
        </div>
      </motion.div>
    ))}
  </div>
);

const ScoreMockup = () => (
  <div className="flex flex-col items-center gap-5 w-full">
    <div className="relative w-40 h-40">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(265 70% 28% / 0.2)" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r="52" fill="none"
          stroke="url(#scoreGrad)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 52}
          initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
          animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - 0.78) }}
          transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(265 70% 45%)" />
            <stop offset="100%" stopColor="hsl(330 85% 55%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-4xl font-bold text-primary-foreground">
          78
        </motion.span>
        <span className="text-xs text-ivero-slate-light">/100</span>
      </div>
    </div>
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
      <TrendingUp className="w-3.5 h-3.5 text-accent" />
      <span className="text-xs font-semibold text-accent">+12% este mês</span>
    </motion.div>
  </div>
);

const SentimentMockup = () => {
  const segments = [
    { label: "Positivo", pct: 64, color: "bg-accent" },
    { label: "Neutro", pct: 28, color: "bg-ivero-slate" },
    { label: "Negativo", pct: 8, color: "bg-destructive" },
  ];
  return (
    <div className="w-full space-y-5">
      {/* Segmented bar */}
      <div className="h-5 rounded-full overflow-hidden flex">
        {segments.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ width: 0 }}
            animate={{ width: `${s.pct}%` }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
            className={`${s.color} ${i === 0 ? "rounded-l-full" : ""} ${i === segments.length - 1 ? "rounded-r-full" : ""}`}
          />
        ))}
      </div>
      {/* Labels */}
      <div className="flex justify-between">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
            <span className="text-sm text-ivero-slate-light">{s.label}</span>
            <span className="text-sm font-semibold text-primary-foreground">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActionsMockup = () => (
  <div className="w-full space-y-2.5">
    {[
      { action: "Criar artigo otimizado sobre [tema-chave]", priority: "Alta", done: false },
      { action: "Atualizar FAQ com perguntas de IA", priority: "Alta", done: false },
      { action: "Adicionar schema markup nos produtos", priority: "Média", done: true },
      { action: "Expandir glossário técnico do setor", priority: "Média", done: true },
    ].map((item, i) => (
      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
        className="flex items-center gap-3 p-3.5 rounded-xl bg-ivero-dark border border-ivero-purple/10"
      >
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
          item.done ? "border-accent bg-accent/20" : "border-ivero-slate/30"
        }`}>
          {item.done && <span className="text-accent text-xs">✓</span>}
        </div>
        <span className={`text-sm flex-1 ${item.done ? "text-ivero-slate-light line-through" : "text-primary-foreground"}`}>{item.action}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
          item.priority === "Alta" ? "bg-accent/15 text-accent" : "bg-ivero-purple/15 text-ivero-slate-light"
        }`}>{item.priority}</span>
      </motion.div>
    ))}
  </div>
);

const AlertsMockup = () => (
  <div className="w-full space-y-2.5">
    {[
      { time: "Agora", msg: "Queda de 12% na visibilidade no Gemini", type: "alert" },
      { time: "2h atrás", msg: "Novo concorrente citado no ChatGPT", type: "info" },
      { time: "5h atrás", msg: "Sentimento positivo subiu para 72%", type: "info" },
    ].map((alert, i) => (
      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }}
        className="flex items-start gap-3 p-3.5 rounded-xl bg-ivero-dark border border-ivero-purple/10"
      >
        <div className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
          alert.type === "alert" ? "bg-amber-400/15 text-amber-400" : "bg-accent/15 text-accent"
        }`}>{alert.type === "alert" ? "Alerta" : "Info"}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-primary-foreground leading-snug">{alert.msg}</p>
          <span className="text-[11px] text-ivero-slate-light">{alert.time}</span>
        </div>
      </motion.div>
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
};

const FeaturesSection = () => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const goNext = useCallback(() => {
    setActive((prev) => (prev + 1) % features.length);
    setProgress(0);
  }, []);

  // Autoplay
  useEffect(() => {
    if (paused) return;
    const tick = 50;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (tick / AUTOPLAY_INTERVAL) * 100;
        if (next >= 100) {
          goNext();
          return 0;
        }
        return next;
      });
    }, tick);
    return () => clearInterval(interval);
  }, [paused, goNext]);

  const handleTabClick = (index: number) => {
    setActive(index);
    setProgress(0);
    setPaused(true);
    // Resume after a pause
    setTimeout(() => setPaused(false), 8000);
  };

  const current = features[active];
  const MockupComponent = mockupComponents[current.mockup];

  return (
    <section
      className="py-20 bg-ivero-dark relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background glows */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-ivero-purple/8 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            <span className="text-primary-foreground">Recursos da Ivero para </span>
            <span className="text-gradient">a presença da sua marca nas IAs</span>
          </h2>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-12 overflow-x-auto pb-2 scrollbar-none justify-start lg:justify-center">
          {features.map((f, i) => (
            <button
              key={f.title}
              onClick={() => handleTabClick(i)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 border whitespace-nowrap shrink-0 ${
                active === i
                  ? "bg-ivero-dark-surface text-primary-foreground border-accent/30 shadow-lg shadow-accent/10"
                  : "bg-transparent text-ivero-slate-light border-ivero-purple/15 hover:border-ivero-purple/30 hover:text-primary-foreground"
              }`}
            >
              <f.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{f.title}</span>
              {/* Progress bar on active tab */}
              {active === i && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-ivero-purple/20 overflow-hidden">
                  <motion.div
                    className="h-full bg-ivero-gradient"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center"
          >
            {/* Left — Text */}
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                <current.icon className="w-4 h-4 text-accent" />
                <span className="text-xs font-semibold text-accent tracking-wide uppercase">
                  Recurso {String(active + 1).padStart(2, "0")}
                </span>
              </div>

              <h3 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">
                {current.title}
              </h3>

              <p className="text-ivero-slate-light text-lg leading-relaxed">
                {current.description}
              </p>

              <ul className="space-y-3 pt-2">
                {current.bullets.map((b, i) => (
                  <motion.li
                    key={b}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="flex items-center gap-3 text-ivero-slate-light"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    <span className="text-sm">{b}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Right — Mockup */}
            <div className="relative">
              <div className="rounded-2xl border border-ivero-purple/15 bg-ivero-dark-surface p-6 md:p-8">
                {/* Window chrome dots */}
                <div className="flex gap-1.5 mb-5">
                  <div className="w-2.5 h-2.5 rounded-full bg-ivero-slate/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-ivero-slate/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-ivero-slate/20" />
                </div>
                <MockupComponent />
              </div>
              {/* Subtle glow behind */}
              <div className="absolute -inset-4 bg-ivero-gradient opacity-[0.03] rounded-3xl blur-2xl -z-10" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default FeaturesSection;
