import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Lock } from "lucide-react";

const plans = [
  {
    name: "Essencial",
    badge: null,
    tagline: "Descubra se as IAs reconhecem sua marca",
    monthlyPrice: "R$ 197",
    annualPrice: "R$ 157",
    cta: "Começar agora",
    highlighted: false,
    variant: "hero-outline" as const,
    features: [
      "Monitoramento de até 2 IAs",
      "Comparação com até 2 concorrentes",
      "Evolução básica de menções (30 dias)",
      "Relatório semanal por e-mail",
      "Monitoramento Multi-IA",
      "Score GEO de Visibilidade",
      "Dashboard GEO",
    ],
    locked: [
      "Análise de Sentimento",
      "Integração com Slack",
      "Mapa de Prompts Estratégicos",
      "Dominância por Modelo de IA",
      "Simulador de Influência em IA",
    ],
  },
  {
    name: "Profissional",
    badge: null,
    tagline: "Monitore, reaja e não perca espaço para concorrentes",
    monthlyPrice: "R$ 397",
    annualPrice: "R$ 317",
    cta: "Ativar inteligência",
    highlighted: false,
    variant: "hero-outline" as const,
    features: [
      "Tudo do Essencial, mais:",
      "Monitoramento de até 3 IAs",
      "Comparação com até 5 concorrentes",
      "Evolução de menções (90 dias)",
      "Alertas estratégicos no Slack (limitado)",
      "1 canal conectado",
      "Análise de Sentimento",
      "Comparativo Competitivo",
    ],
    locked: [
      "Ivero Bot completo",
      "Alertas ilimitados",
      "Mapa de Prompts Estratégicos",
      "Dominância por Modelo de IA",
      "Simulador de Influência em IA",
    ],
  },
  {
    name: "PRO",
    badge: "🔥 Recomendado",
    tagline: "Sua marca citada quando o cliente está decidindo",
    monthlyPrice: "R$ 697",
    annualPrice: "R$ 557",
    cta: "Dominar minha presença em IA",
    highlighted: true,
    variant: "hero" as const,
    features: [
      "Tudo do Profissional, mais:",
      "Monitoramento de até 4 IAs",
      "Comparação com até 10 concorrentes",
      "Evolução histórica completa de menções",
      "Alertas ilimitados no Slack",
      "Múltiplos canais conectados",
      "Ivero Bot (/status, /concorrente, /tendências)",
      "Mapa de Prompts Estratégicos",
    ],
    locked: [
      "Dominância por Modelo de IA",
      "Simulador de Influência em IA",
    ],
  },
  {
    name: "Enterprise",
    badge: "🔴 Estratégico",
    tagline: "Presença em IA como vantagem competitiva real",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    cta: "Falar com especialista",
    highlighted: false,
    variant: "hero-outline" as const,
    features: [
      "Tudo do PRO, mais:",
      "Monitoramento de 5 IAs",
      "Concorrentes ilimitados",
      "Evolução histórica completa de menções",
      "Múltiplos workspaces",
      "Webhooks personalizados",
      "Dominância por Modelo de IA",
      "Simulador de Influência em IA",
    ],
    locked: [],
  },
];

const InvestSection = () => {
  const [isAnnual, setIsAnnual] = useState(false);

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

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 max-w-7xl mx-auto">
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
                className={`relative flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden ${
                  plan.highlighted
                    ? "border-accent/50 bg-ivero-dark-surface shadow-2xl shadow-accent/15 scale-[1.02]"
                    : "border-ivero-purple/20 bg-ivero-dark-surface hover:border-ivero-purple/40"
                }`}
              >
                {plan.badge && (
                  <div className={`text-center text-xs font-bold uppercase tracking-wider py-2 px-4 ${
                    plan.highlighted
                      ? "bg-ivero-gradient text-primary-foreground"
                      : "bg-ivero-purple/20 text-ivero-purple-light"
                  }`}>
                    {plan.badge}
                  </div>
                )}

                <div className="p-7 flex flex-col flex-1">
                  <div className="mb-5">
                    <h3 className="font-display text-xl font-bold text-primary-foreground mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-ivero-slate-light text-xs mb-3">{plan.tagline}</p>
                  </div>

                  {/* Preço */}
                  <div className="mb-6">
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
                    {isAnnual && !isCustom && (
                      <p className="text-ivero-slate-light/60 text-[10px] mt-1">
                        Cobrado anualmente · economia de 20%
                      </p>
                    )}
                  </div>

                  {/* Features + Recursos misturados */}
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, i) => {
                      const isInheritLine = i === 0 && feature.startsWith("Tudo do");
                      return (
                        <li key={feature} className={`flex items-start gap-2 text-xs ${isInheritLine ? "text-ivero-purple-light font-semibold mb-1" : "text-ivero-slate-light"}`}>
                          {!isInheritLine && <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />}
                          {isInheritLine && <span className="text-ivero-purple-light">↳</span>}
                          {feature}
                        </li>
                      );
                    })}
                    {plan.locked.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-ivero-slate-light/40">
                        <Lock className="w-3 h-3 shrink-0 mt-0.5" />
                        <span className="line-through">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.variant}
                    size="sm"
                    className={`w-full mt-auto text-xs py-5 ${
                      plan.variant === "hero-outline"
                        ? "border-ivero-purple/40 text-ivero-purple-light hover:bg-ivero-purple hover:text-primary-foreground"
                        : ""
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default InvestSection;
