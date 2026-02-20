import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Cpu, Bell, Search, BarChart2 } from "lucide-react";

const plans = [
  {
    name: "Presença",
    badge: null,
    tagline: "Descubra se as IAs reconhecem sua marca",
    monthlyPrice: "R$ 197",
    annualPrice: "R$ 157",
    annualSaving: "R$ 480",
    cta: "Garantir minha presença →",
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
    cta: "Ampliar minha influência →",
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
    cta: "Consolidar minha autoridade →",
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
    cta: "Receber uma proposta personalizada →",
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
    <section className="py-20 bg-ivero-dark relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-ivero-purple/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            <span className="text-primary-foreground">Nossos </span>
            <span className="text-gradient">Planos</span>
          </h2>
          <p className="text-lg text-ivero-slate-light max-w-2xl mx-auto mb-8">
            Escolha o plano ideal e garanta que sua marca seja vista pelas IAs que o mundo usa.
          </p>

          {/* Toggle mensal/anual */}
          <div className="inline-flex items-center gap-3 bg-ivero-dark-surface border border-ivero-purple/20 rounded-full p-1.5">
            <button
              onClick={() => setIsAnnual(false)}
              className={`text-sm font-medium px-5 py-2 rounded-full transition-all duration-200 ${
                !isAnnual
                  ? "bg-ivero-gradient text-primary-foreground shadow-md"
                  : "text-ivero-slate-light hover:text-primary-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`text-sm font-medium px-5 py-2 rounded-full transition-all duration-200 flex items-center gap-2 ${
                isAnnual
                  ? "bg-ivero-gradient text-primary-foreground shadow-md"
                  : "text-ivero-slate-light hover:text-primary-foreground"
              }`}
            >
              Anual
              <span className="text-[10px] font-bold bg-accent/20 text-accent border border-accent/30 px-1.5 py-0.5 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 max-w-7xl mx-auto items-start">
          {plans.map((plan, index) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            const isCustom = price === "Custom";

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{
                  scale: 1.03,
                  transition: { duration: 0.2 },
                }}
                className={`group relative flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
                  plan.highlighted
                    ? "border-accent/50 bg-ivero-dark-surface shadow-2xl shadow-accent/15 scale-[1.02] hover:border-accent/80 hover:shadow-accent/30"
                    : "border-ivero-purple/20 bg-ivero-dark-surface hover:border-ivero-purple/60 hover:shadow-xl hover:shadow-ivero-purple/20"
                }`}
              >
                {/* Brilho de borda no hover */}
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                  plan.highlighted
                    ? "shadow-[inset_0_0_20px_hsl(var(--accent)/0.15)]"
                    : "shadow-[inset_0_0_20px_hsl(var(--ivero-purple-light)/0.1)]"
                }`} />

                {/* Badge — altura fixa para manter alinhamento */}
                <div className={`text-center text-xs font-bold uppercase tracking-wider py-2 px-4 ${
                  plan.badge
                    ? plan.highlighted
                      ? "bg-ivero-gradient text-primary-foreground"
                      : "bg-ivero-purple/20 text-primary-foreground"
                    : "opacity-0 pointer-events-none"
                }`}>
                  {plan.badge ?? "‌"}
                </div>

                <div className="flex flex-col flex-1">
                  {/* Plan name + tagline */}
                  <div className={`relative px-7 pt-7 pb-6 mb-1 overflow-hidden min-h-[120px] ${
                    plan.highlighted
                      ? "bg-gradient-to-br from-accent/20 via-accent/5 to-ivero-dark-surface"
                      : "bg-gradient-to-br from-ivero-purple/20 via-ivero-purple/5 to-ivero-dark-surface"
                  }`}>
                    <div className={`absolute -top-4 -left-4 w-20 h-20 rounded-full blur-2xl opacity-60 ${
                      plan.highlighted ? "bg-accent" : "bg-ivero-purple-light"
                    }`} />
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      plan.highlighted
                        ? "bg-gradient-to-b from-accent via-accent/80 to-accent/10"
                        : "bg-gradient-to-b from-ivero-purple-light via-ivero-purple/60 to-transparent"
                    }`} />

                    <div className="relative flex items-center gap-2 mb-3">
                      {plan.highlighted && (
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0 shadow-[0_0_8px_hsl(var(--accent))]" />
                      )}
                      <h3 className={`font-display text-2xl font-black tracking-widest uppercase leading-none ${
                        plan.highlighted
                          ? "text-white drop-shadow-[0_2px_16px_hsl(var(--accent)/0.9)] [text-shadow:0_0_20px_hsl(var(--accent)/0.5)]"
                          : "text-white drop-shadow-[0_0_8px_hsl(var(--ivero-purple-light)/0.8)]"
                      }`}>
                        {plan.name}
                      </h3>
                    </div>

                    <p className={`relative text-sm leading-snug font-semibold ${
                      plan.highlighted ? "text-white" : "text-ivero-slate-light"
                    }`}>
                      {plan.tagline}
                    </p>

                    <div className={`absolute bottom-0 left-0 right-0 h-px ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-accent via-accent/40 to-transparent"
                        : "bg-gradient-to-r from-ivero-purple-light/60 via-ivero-purple/20 to-transparent"
                    }`} />
                  </div>

                  <div className="px-7 pt-5 pb-7 flex flex-col flex-1">

                    {/* Preço */}
                    <div className="mb-5 h-16 flex flex-col justify-start">
                      <motion.div
                        key={price}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className="font-display text-3xl font-bold text-primary-foreground">
                          {price}
                        </span>
                        {!isCustom && (
                          <span className="text-ivero-slate-light text-xs ml-1">/mês</span>
                        )}
                      </motion.div>
                      {isAnnual && !isCustom && plan.annualSaving && (
                        <p className="text-accent/80 text-sm font-bold mt-1">
                          ✦ Economia de {plan.annualSaving}/ano
                        </p>
                      )}
                      {isAnnual && isCustom && (
                        <p className="text-ivero-slate-light/60 text-[10px] mt-1">
                          Proposta personalizada
                        </p>
                      )}
                    </div>

                    {/* Métricas-chave — grid 2x2 */}
                    <div className={`grid grid-cols-2 gap-3 mb-5 p-4 rounded-xl border ${
                      plan.highlighted
                        ? "border-accent/20 bg-accent/5"
                        : "border-ivero-purple/15 bg-ivero-purple/5"
                    }`}>
                      {plan.metrics.map((metric) => {
                        const Icon = metric.icon;
                        return (
                          <div key={metric.label} className="flex flex-col items-center text-center gap-1.5 py-3">
                            <Icon className={`w-6 h-6 mb-1 ${plan.highlighted ? "text-accent" : "text-ivero-purple-light"}`} />
                            <span className="text-xl font-bold leading-none text-primary-foreground">
                              {metric.value}
                            </span>
                            <span className="text-xs text-ivero-slate-light/70 leading-tight">
                              {metric.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Diferenciais exclusivos */}
                    <ul className="space-y-1.5 mb-6 flex-1">
                      {plan.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-start gap-2 text-xs text-ivero-slate-light">
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

        {/* Rodapé comum */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 text-center space-y-3"
        >
          {/* Frase de herança — destaque visual */}
          <p className="text-sm font-semibold text-primary-foreground drop-shadow-[0_0_12px_hsl(var(--accent)/0.6)] [text-shadow:0_0_16px_hsl(var(--accent)/0.4)]">
            <span className="text-accent font-bold">✦</span>{" "}
            Cada plano inclui todos os recursos do anterior, mais os seus exclusivos.
          </p>
          {/* Linha de features comuns */}
          <p className="text-xs text-ivero-slate-light/70">
            Todos os planos incluem: Dashboard GEO · Score de Visibilidade · Análise Comparativa · Suporte prioritário · Sem contrato · Cancele quando quiser
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default InvestSection;
