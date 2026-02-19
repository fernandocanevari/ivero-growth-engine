import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, GitCompare, TrendingUp, Shield, FileText, Bell } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Monitoramento Multi-IA",
    description: "Rastreie menções da sua marca no ChatGPT, Gemini, Perplexity, Claude e outros motores generativos simultaneamente.",
    detail: "A Ivero consulta automaticamente as principais IAs generativas com perguntas reais do seu setor, identificando quando e como sua marca é mencionada em cada plataforma.",
    mockup: "monitoring",
  },
  {
    icon: GitCompare,
    title: "Análise Comparativa",
    description: "Compare sua visibilidade com concorrentes diretos. Saiba quem está sendo recomendado e por quê.",
    detail: "Visualize side-by-side como sua marca performa contra concorrentes nas respostas de IA. Entenda os padrões de recomendação e descubra oportunidades.",
    mockup: "compare",
  },
  {
    icon: TrendingUp,
    title: "Score de Visibilidade GEO",
    description: "Métrica proprietária que quantifica o quão presente e bem posicionada sua marca está nas respostas de IA.",
    detail: "Um índice unificado de 0 a 100 que consolida frequência de citação, posição na resposta, sentimento e contexto em todas as IAs monitoradas.",
    mockup: "score",
  },
  {
    icon: Shield,
    title: "Análise de Sentimento",
    description: "Entenda se a IA fala da sua marca de forma positiva, neutra ou negativa — e o que influencia esse tom.",
    detail: "Algoritmos de NLP analisam o contexto e tom de cada menção, mapeando os fatores que influenciam a percepção da IA sobre sua marca.",
    mockup: "sentiment",
  },
  {
    icon: FileText,
    title: "Planos de Ação Estratégicos",
    description: "Receba recomendações prescritivas de conteúdo, SEO e posicionamento para melhorar sua presença em IA.",
    detail: "Com base nos dados coletados, a Ivero gera playbooks personalizados com ações concretas de conteúdo, SEO técnico e posicionamento de marca.",
    mockup: "actions",
  },
  {
    icon: Bell,
    title: "Alertas em Tempo Real",
    description: "Seja notificado quando houver mudanças na forma como IAs citam sua marca ou seus concorrentes.",
    detail: "Configure alertas por email ou webhook para mudanças significativas: queda de visibilidade, novo concorrente citado, alteração de sentimento e mais.",
    mockup: "alerts",
  },
];

/* ── Mini Mockups ── */

const MonitoringMockup = () => (
  <div className="space-y-3 w-full">
    {["ChatGPT", "Gemini", "Perplexity", "Claude"].map((ai, i) => (
      <motion.div
        key={ai}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.1 }}
        className="flex items-center gap-3 p-3 rounded-xl bg-ivero-dark border border-ivero-purple/15"
      >
        <div className="w-8 h-8 rounded-lg bg-ivero-gradient flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary-foreground">{ai[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-primary-foreground">{ai}</span>
            <span className="text-xs text-accent font-semibold">{[92, 78, 85, 71][i]}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-ivero-purple/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${[92, 78, 85, 71][i]}%` }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
              className="h-full rounded-full bg-ivero-gradient"
            />
          </div>
        </div>
      </motion.div>
    ))}
  </div>
);

const CompareMockup = () => (
  <div className="w-full space-y-4">
    <div className="grid grid-cols-3 gap-2 text-center text-xs text-ivero-slate-light pb-2 border-b border-ivero-purple/10">
      <span>Marca</span>
      <span>Citações</span>
      <span>Posição</span>
    </div>
    {[
      { name: "Sua Marca", citations: 47, pos: "1º", highlight: true },
      { name: "Concorrente A", citations: 32, pos: "2º" },
      { name: "Concorrente B", citations: 28, pos: "3º" },
      { name: "Concorrente C", citations: 15, pos: "5º" },
    ].map((item, i) => (
      <motion.div
        key={item.name}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
        className={`grid grid-cols-3 gap-2 text-center p-2.5 rounded-lg ${
          item.highlight ? "bg-accent/10 border border-accent/20" : "bg-ivero-dark border border-ivero-purple/10"
        }`}
      >
        <span className={`text-sm font-medium ${item.highlight ? "text-accent" : "text-primary-foreground"}`}>{item.name}</span>
        <span className="text-sm text-primary-foreground">{item.citations}</span>
        <span className={`text-sm font-semibold ${item.highlight ? "text-accent" : "text-ivero-slate-light"}`}>{item.pos}</span>
      </motion.div>
    ))}
  </div>
);

const ScoreMockup = () => (
  <div className="flex flex-col items-center gap-5 w-full">
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(265 70% 28% / 0.2)" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r="52" fill="none"
          stroke="url(#scoreGrad)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 52}
          initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
          animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - 0.87) }}
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
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-3xl font-bold text-primary-foreground"
        >87</motion.span>
        <span className="text-xs text-ivero-slate-light">/100</span>
      </div>
    </div>
    <div className="flex gap-3 w-full">
      {[
        { label: "Frequência", val: "Alta" },
        { label: "Posição", val: "Top 3" },
        { label: "Sentimento", val: "+82%" },
      ].map((s, i) => (
        <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
          className="flex-1 text-center p-2 rounded-lg bg-ivero-dark border border-ivero-purple/10">
          <div className="text-sm font-semibold text-accent">{s.val}</div>
          <div className="text-[10px] text-ivero-slate-light">{s.label}</div>
        </motion.div>
      ))}
    </div>
  </div>
);

const SentimentMockup = () => (
  <div className="w-full space-y-4">
    {[
      { label: "Positivo", pct: 68, color: "from-accent to-ivero-pink-light" },
      { label: "Neutro", pct: 24, color: "from-ivero-slate to-ivero-slate-light" },
      { label: "Negativo", pct: 8, color: "from-destructive to-destructive" },
    ].map((s, i) => (
      <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 }} className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-primary-foreground">{s.label}</span>
          <span className="text-ivero-slate-light font-medium">{s.pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-ivero-purple/15">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${s.pct}%` }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.7 }}
            className={`h-full rounded-full bg-gradient-to-r ${s.color}`}
          />
        </div>
      </motion.div>
    ))}
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
      className="mt-3 p-3 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent text-center">
      ✦ Sentimento geral: Predominantemente Positivo
    </motion.div>
  </div>
);

const ActionsMockup = () => (
  <div className="w-full space-y-3">
    {[
      { priority: "Alta", action: "Criar artigo otimizado sobre [tema-chave]", status: "Pendente" },
      { priority: "Alta", action: "Atualizar FAQ com perguntas frequentes de IA", status: "Em progresso" },
      { priority: "Média", action: "Adicionar schema markup nos produtos", status: "Pendente" },
      { priority: "Baixa", action: "Expandir glossário técnico do setor", status: "Concluído" },
    ].map((item, i) => (
      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
        className="flex items-center gap-3 p-3 rounded-lg bg-ivero-dark border border-ivero-purple/10">
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          item.priority === "Alta" ? "bg-accent" : item.priority === "Média" ? "bg-amber-400" : "bg-emerald-400"
        }`} />
        <span className="text-sm text-primary-foreground flex-1">{item.action}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
          item.status === "Concluído" ? "bg-emerald-500/15 text-emerald-400" :
          item.status === "Em progresso" ? "bg-accent/15 text-accent" :
          "bg-ivero-purple/15 text-ivero-slate-light"
        }`}>{item.status}</span>
      </motion.div>
    ))}
  </div>
);

const AlertsMockup = () => (
  <div className="w-full space-y-3">
    {[
      { time: "Agora", msg: "Queda de 12% na visibilidade no Gemini", type: "warning" },
      { time: "2h atrás", msg: "Novo concorrente citado no ChatGPT", type: "info" },
      { time: "5h atrás", msg: "Sentimento positivo subiu para 72%", type: "success" },
      { time: "1d atrás", msg: "Sua marca foi citada em 3 novas queries", type: "info" },
    ].map((alert, i) => (
      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }}
        className="flex gap-3 p-3 rounded-lg bg-ivero-dark border border-ivero-purple/10">
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
          alert.type === "warning" ? "bg-amber-400" : alert.type === "success" ? "bg-emerald-400" : "bg-accent"
        }`} />
        <div className="flex-1">
          <p className="text-sm text-primary-foreground">{alert.msg}</p>
          <span className="text-[10px] text-ivero-slate-light">{alert.time}</span>
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
  const current = features[active];
  const MockupComponent = mockupComponents[current.mockup];

  return (
    <section className="py-20 bg-ivero-dark relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-ivero-purple/8 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            <span className="text-primary-foreground">Recursos da Ivero para </span>
            <span className="text-gradient">a presença da sua marca nas IAs</span>
          </h2>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {features.map((f, i) => (
            <button
              key={f.title}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 border ${
                active === i
                  ? "bg-ivero-gradient text-primary-foreground border-transparent shadow-lg shadow-accent/15"
                  : "bg-ivero-dark-surface text-ivero-slate-light border-ivero-purple/15 hover:border-accent/30 hover:text-primary-foreground"
              }`}
            >
              <f.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{f.title}</span>
            </button>
          ))}
        </div>

        {/* Content area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="grid lg:grid-cols-2 gap-10 items-center"
          >
            {/* Left - Text */}
            <div className="space-y-6">
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
              <p className="text-ivero-slate-light/80 leading-relaxed">
                {current.detail}
              </p>
            </div>

            {/* Right - Mockup */}
            <div className="relative">
              <div className="rounded-2xl border border-ivero-purple/15 bg-ivero-dark-surface p-6 md:p-8">
                {/* Window dots */}
                <div className="flex gap-1.5 mb-5">
                  <div className="w-2.5 h-2.5 rounded-full bg-ivero-slate/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-ivero-slate/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-ivero-slate/20" />
                </div>
                <MockupComponent />
              </div>
              {/* Glow behind mockup */}
              <div className="absolute -inset-4 bg-ivero-gradient opacity-[0.03] rounded-3xl blur-2xl -z-10" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default FeaturesSection;
