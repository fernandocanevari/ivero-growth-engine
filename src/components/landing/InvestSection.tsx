import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Cpu, Bell, Search, BarChart2, ShieldCheck, Gauge, Radar, BellRing, Mail, Headphones, Compass } from "lucide-react";

const plans = [
  {
    name: "Presença",
    badge: null,
    tagline: "Descubra se as IAs reconhecem sua marca",
    monthlyPrice: "R$ 197",
    annualPrice: "R$ 157",
    annualSaving: "R$ 480",
    cta: "Quero ser visto pelas IAs →",
    highlighted: false,
    metrics: [
      { icon: Cpu, label: "IAs monitoradas", value: "2" },
      { icon: Bell, label: "Avisos/mês", value: "50" },
      { icon: Search, label: "Prompts monitorados", value: "10" },
      { icon: BarChart2, label: "Consultas/mês", value: "500" },
    ],
    highlights: [
      "Score GEO de Visibilidade",
      "Relatório semanal por e-mail",
    ],
  },
  {
    name: "Influência",
    badge: null,
    tagline: "Monitore, reaja e não perca espaço para concorrentes",
    monthlyPrice: "R$ 397",
    annualPrice: "R$ 317",
    annualSaving: "R$ 960",
    cta: "Quero superar meus concorrentes →",
    highlighted: false,
    metrics: [
      { icon: Cpu, label: "IAs monitoradas", value: "3" },
      { icon: Bell, label: "Avisos/mês", value: "200" },
      { icon: Search, label: "Prompts monitorados", value: "30" },
      { icon: BarChart2, label: "Consultas/mês", value: "2.000" },
    ],
    highlights: [
      "Análise de Sentimento",
      "Análise Comparativa com concorrentes",
    ],
  },
  {
    name: "Autoridade",
    badge: "🔥 Recomendado",
    tagline: "Sua marca citada quando o cliente está decidindo",
    monthlyPrice: "R$ 697",
    annualPrice: "R$ 557",
    annualSaving: "R$ 1.680",
    cta: "Quero dominar meu setor nas IAs →",
    highlighted: true,
    metrics: [
      { icon: Cpu, label: "IAs monitoradas", value: "4" },
      { icon: Bell, label: "Avisos/mês", value: "Ilimitados" },
      { icon: Search, label: "Prompts monitorados", value: "100" },
      { icon: BarChart2, label: "Consultas/mês", value: "10.000" },
    ],
    highlights: [
      "Mapa de Prompts Estratégicos",
      "Plano de Ação Estratégico",
    ],
  },
  {
    name: "Domínio",
    badge: "🔴 Estratégico",
    tagline: "Presença em IA como vantagem competitiva real",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    annualSaving: null,
    cta: "Quero minha estratégia exclusiva →",
    highlighted: false,
    metrics: [
      { icon: Cpu, label: "IAs monitoradas", value: "5" },
      { icon: Bell, label: "Avisos/mês", value: "Ilimitados" },
      { icon: Search, label: "Prompts monitorados", value: "Ilimitados" },
      { icon: BarChart2, label: "Consultas/mês", value: "Ilimitadas" },
    ],
    highlights: [
      "Dominância por Modelo de IA",
      "Simulador de Influência em IA",
    ],
  },
];

const InvestSection = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="planos" className="py-14 sm:py-20 bg-surface-1 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-ivero-purple/6 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/4 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-10"
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">Nossos </span>
            <span className="text-gradient">Planos</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8">
            Escolha o plano ideal e garanta que sua marca seja vista pelas IAs que o mundo usa.
          </p>

          {/* Toggle mensal/anual */}
          <div className="inline-flex items-center gap-3 bg-white border border-ivero-purple/20 rounded-full p-1.5 shadow-sm">
            <button
              onClick={() => setIsAnnual(false)}
              className={`text-sm font-medium px-4 sm:px-5 py-2 rounded-full transition-all duration-200 ${
                !isAnnual
                  ? "bg-ivero-gradient text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`text-sm font-medium px-4 sm:px-5 py-2 rounded-full transition-all duration-200 flex items-center gap-2 ${
                isAnnual
                  ? "bg-ivero-gradient text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
              <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full shadow-sm ${
                isAnnual
                  ? "bg-white text-accent"
                  : "bg-accent text-white"
              }`}>
                -20%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Cards — 1 col mobile, 2 col tablet, 4 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 max-w-7xl mx-auto items-start">
          {plans.map((plan, index) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            const isCustom = price === "Custom";

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ type: "spring", stiffness: 80, damping: 20, delay: index * 0.12 }}
                whileHover={{
                  scale: 1.03,
                  transition: { duration: 0.2 },
                }}
                className={`group relative flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
                  plan.highlighted
                    ? "border-accent/60 bg-white shadow-xl shadow-accent/10 sm:scale-[1.02] hover:border-accent hover:shadow-accent/20"
                    : "border-ivero-purple/20 bg-white hover:border-ivero-purple/50 hover:shadow-lg hover:shadow-ivero-purple/10"
                }`}
              >
                {/* Brilho de borda no hover */}
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                  plan.highlighted
                    ? "shadow-[inset_0_0_20px_hsl(var(--accent)/0.10)]"
                    : "shadow-[inset_0_0_20px_hsl(var(--ivero-purple-light)/0.08)]"
                }`} />

                {/* Badge */}
                <div className={`text-center text-xs font-bold uppercase tracking-wider py-2 px-4 ${
                  plan.badge
                    ? plan.highlighted
                      ? "bg-ivero-gradient text-primary-foreground"
                      : "bg-ivero-purple/10 text-ivero-purple"
                    : "opacity-0 pointer-events-none"
                }`}>
                  {plan.badge ?? "‌"}
                </div>

                <div className="flex flex-col flex-1">
                  {/* Plan header */}
                  <div className={`relative px-5 sm:px-7 pt-5 sm:pt-7 pb-5 sm:pb-6 mb-1 overflow-hidden min-h-[100px] sm:min-h-[120px] ${
                    plan.highlighted
                      ? "bg-gradient-to-br from-accent/12 via-accent/4 to-white"
                      : "bg-gradient-to-br from-ivero-purple/10 via-ivero-purple/3 to-white"
                  }`}>
                    <div className={`absolute -top-4 -left-4 w-20 h-20 rounded-full blur-2xl opacity-40 ${
                      plan.highlighted ? "bg-accent" : "bg-ivero-purple-light"
                    }`} />
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      plan.highlighted
                        ? "bg-gradient-to-b from-accent via-accent/80 to-accent/10"
                        : "bg-gradient-to-b from-ivero-purple-light via-ivero-purple/60 to-transparent"
                    }`} />

                    <div className="relative flex items-center gap-2 mb-2 sm:mb-3">
                      {plan.highlighted && (
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0 shadow-[0_0_8px_hsl(var(--accent))]" />
                      )}
                      <h3 className={`font-display text-xl sm:text-2xl font-black tracking-widest uppercase leading-none ${
                        plan.highlighted ? "text-accent" : "text-ivero-purple"
                      }`}>
                        {plan.name}
                      </h3>
                    </div>

                    <p className="relative text-xs sm:text-sm leading-snug font-semibold text-foreground/80">
                      {plan.tagline}
                    </p>

                    <div className={`absolute bottom-0 left-0 right-0 h-px ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-accent via-accent/40 to-transparent"
                        : "bg-gradient-to-r from-ivero-purple-light/60 via-ivero-purple/20 to-transparent"
                    }`} />
                  </div>

                  <div className="px-5 sm:px-7 pt-4 sm:pt-5 pb-5 sm:pb-7 flex flex-col flex-1">
                    {/* Preço */}
                    <div className="mb-4 sm:mb-5 h-14 sm:h-16 flex flex-col justify-start">
                      <motion.div
                        key={price}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                          {price}
                        </span>
                        {!isCustom && (
                          <span className="text-muted-foreground text-xs ml-1">/mês</span>
                        )}
                      </motion.div>
                      {isAnnual && !isCustom && plan.annualSaving && (
                        <p className="text-accent text-xs sm:text-sm font-bold mt-1">
                          ✦ Economia de {plan.annualSaving}/ano
                        </p>
                      )}
                      {isAnnual && isCustom && (
                        <p className="text-muted-foreground text-[10px] mt-1">
                          Proposta personalizada
                        </p>
                      )}
                    </div>

                    {/* Métricas-chave — grid 2x2 */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-5 p-3 sm:p-4 rounded-xl border border-accent/15 bg-accent/3">
                      {plan.metrics.map((metric) => {
                        const Icon = metric.icon;
                        return (
                          <div key={metric.label} className="flex flex-col items-center text-center gap-1 sm:gap-1.5 py-2 sm:py-3">
                            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 ${plan.highlighted ? "text-accent" : "text-ivero-purple-light"}`} />
                            <span className="text-lg sm:text-xl font-bold leading-none text-foreground">
                              {metric.value}
                            </span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                               {metric.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Diferenciais */}
                    <ul className="space-y-1.5 mb-5 sm:mb-6 flex-1">
                      {plan.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-start gap-2 text-xs text-foreground/80">
                          <span className={`shrink-0 mt-0.5 font-bold ${plan.highlighted ? "text-accent" : "text-ivero-purple-light"}`}>✦</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant="hero"
                      size="sm"
                      className="w-full mt-auto text-xs py-5"
                    >
                      {plan.cta}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Selo de garantia Ivero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-10 sm:mt-14 max-w-7xl mx-auto px-2"
        >
          <p className="text-center text-xs sm:text-sm font-medium text-muted-foreground mb-4">
            <span className="text-accent font-bold">✦</span>{" "}
            Cada plano inclui todos os recursos do anterior, mais os seus exclusivos.
          </p>

          <div className="relative rounded-2xl border border-ivero-purple/20 bg-gradient-to-br from-ivero-purple/5 via-white to-accent/5 shadow-lg shadow-ivero-purple/5 overflow-hidden">
            {/* Faixa superior gradiente */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-ivero-gradient" />

            {/* Glows decorativos */}
            <div className="absolute -top-16 -left-16 w-48 h-48 bg-ivero-purple/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                {/* Header compacto */}
                <div className="flex items-center gap-3 lg:shrink-0 lg:border-r lg:border-ivero-purple/15 lg:pr-6">
                  <div className="w-9 h-9 rounded-full bg-ivero-gradient flex items-center justify-center shadow-md shadow-ivero-purple/30 shrink-0">
                    <ShieldCheck className="w-4.5 h-4.5 text-primary-foreground" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight">
                    Incluso em<br className="hidden lg:block" />{" "}
                    <span className="text-gradient">todos os planos</span>
                  </h3>
                </div>

                {/* Grid horizontal de benefícios */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 flex-1">
                  {[
                    { icon: Gauge, label: "Score GEO" },
                    { icon: Radar, label: "Monitoramento de IAs" },
                    { icon: BellRing, label: "Alertas de menções" },
                    { icon: Mail, label: "Relatório semanal" },
                    { icon: Headphones, label: "Suporte prioritário" },
                    { icon: Compass, label: "Onboarding Ivero" },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/60 border border-ivero-purple/10"
                    >
                      <Icon className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={2.25} />
                      <span className="text-[11px] sm:text-xs font-medium text-foreground/85 leading-tight">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Faixa inferior */}
              <div className="mt-4 pt-3 border-t border-ivero-purple/10">
                <p className="text-center text-[10px] sm:text-[11px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                  Sem fidelidade <span className="text-accent">•</span> Cancele quando quiser <span className="text-accent">•</span> Evolua conforme sua operação cresce
                </p>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default InvestSection;
