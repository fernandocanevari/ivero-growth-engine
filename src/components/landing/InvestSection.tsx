import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Grátis",
    period: "",
    description: "Explore sua visibilidade em IA",
    features: [
      "1 marca monitorada",
      "3 IAs rastreadas",
      "Relatório mensal básico",
      "Score GEO inicial",
    ],
    variant: "hero-outline" as const,
    highlighted: false,
  },
  {
    name: "Pro",
    price: "R$ 497",
    period: "/mês",
    description: "Para marcas que querem dominar a IA",
    features: [
      "Marcas ilimitadas",
      "Todas as IAs rastreadas",
      "Análise comparativa completa",
      "Planos de ação estratégicos",
      "Alertas em tempo real",
      "Suporte prioritário",
    ],
    variant: "hero" as const,
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Para grandes operações",
    features: [
      "Tudo do Pro",
      "API dedicada",
      "White-label para agências",
      "Onboarding personalizado",
      "Integrações customizadas",
      "Account manager",
    ],
    variant: "hero-outline" as const,
    highlighted: false,
  },
];

const InvestSection = () => {
  return (
    <section className="py-16 bg-ivero-dark relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-ivero-purple/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            <span className="text-primary-foreground">Invista na sua </span>
            <span className="text-gradient">presença em IA</span>
          </h2>
          <p className="text-lg text-ivero-slate-light max-w-2xl mx-auto">
            Escolha o plano ideal para garantir que sua marca não fique invisível.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className={`relative p-8 rounded-2xl border transition-all duration-300 ${
                plan.highlighted
                  ? "border-accent/50 bg-ivero-dark-surface shadow-xl shadow-accent/10 scale-105"
                  : "border-ivero-purple/20 bg-ivero-dark-surface hover:border-ivero-purple/40"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-ivero-gradient text-primary-foreground text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">
                  Mais popular
                </div>
              )}

              <h3 className="font-display text-xl font-semibold text-primary-foreground mb-2">
                {plan.name}
              </h3>
              <p className="text-ivero-slate-light text-sm mb-6">{plan.description}</p>

              <div className="mb-8">
                <span className="font-display text-4xl font-bold text-primary-foreground">{plan.price}</span>
                <span className="text-ivero-slate-light text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-ivero-slate-light">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.variant}
                size="lg"
                className={`w-full py-6 ${
                  plan.variant === "hero-outline"
                    ? "border-ivero-purple/40 text-ivero-purple-light hover:bg-ivero-purple hover:text-primary-foreground"
                    : ""
                }`}
              >
                {plan.name === "Enterprise" ? "Falar com vendas" : "Começar agora"}
                <ArrowRight className="ml-2" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InvestSection;
