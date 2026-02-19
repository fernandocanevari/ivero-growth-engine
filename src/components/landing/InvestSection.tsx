import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight, Lock } from "lucide-react";

// 9 recursos da Ivero distribuídos progressivamente por plano
const ALL_RESOURCES = [
  "Monitoramento Multi-IA",
  "Score GEO de Visibilidade",
  "Dashboard GEO",
  "Análise de Sentimento",
  "Comparativo Competitivo",
  "Mapa de Prompts Estratégicos",
  "Alertas em Tempo Real",
  "Dominância por Modelo de IA",
  "Simulador de Influência em IA",
];

const plans = [
  {
    name: "Essencial",
    badge: null,
    tagline: "Ideal para marcas que estão começando",
    description: "Diagnóstico estratégico inicial da sua marca no ecossistema de IA.",
    price: "Consulte",
    period: "",
    cta: "Começar agora",
    highlighted: false,
    variant: "hero-outline" as const,
    includedResources: 3,
    features: [
      "Monitoramento de até 2 IAs",
      "Comparação com até 2 concorrentes",
      "Evolução básica de menções (30 dias)",
      "Relatório semanal por e-mail",
    ],
    locked: [
      "Alertas em tempo real",
      "Integração com Slack",
      "Tendências emergentes",
      "Comparativo avançado",
    ],
  },
  {
    name: "Profissional",
    badge: null,
    tagline: "Ideal para times de marketing ágeis",
    description: "Monitoramento ativo com capacidade de ação em tempo real.",
    price: "Consulte",
    period: "",
    cta: "Ativar inteligência em tempo real",
    highlighted: false,
    variant: "hero-outline" as const,
    includedResources: 5,
    features: [
      "Monitoramento de até 3 IAs",
      "Comparação com até 5 concorrentes",
      "Evolução de menções (90 dias)",
      "Alertas estratégicos no Slack (limitado)",
      "1 canal conectado",
    ],
    locked: [
      "Ivero Bot completo",
      "Alertas ilimitados",
      "Análise preditiva",
    ],
  },
  {
    name: "PRO",
    badge: "🔥 Recomendado",
    tagline: "Ideal para empresas que querem dominar a IA",
    description: "Transforme o Slack no centro estratégico da sua marca.",
    price: "Consulte",
    period: "",
    cta: "Dominar minha presença em IA",
    highlighted: true,
    variant: "hero" as const,
    includedResources: 7,
    features: [
      "Monitoramento de até 4 IAs",
      "Comparação com até 10 concorrentes",
      "Evolução histórica completa de menções",
      "Alertas ilimitados no Slack",
      "Múltiplos canais conectados",
      "Ivero Bot (/status, /concorrente, /tendências)",
      "Alertas de tendências emergentes",
      "Comparativo avançado de posicionamento",
    ],
    locked: [
      "Múltiplos workspaces",
      "Score preditivo de risco reputacional",
    ],
  },
  {
    name: "Enterprise",
    badge: "🔴 Estratégico",
    tagline: "Ideal para empresas que tratam marca como ativo estratégico",
    description: "Infraestrutura completa de inteligência de presença em IA.",
    price: "Custom",
    period: "",
    cta: "Falar com especialista",
    highlighted: false,
    variant: "hero-outline" as const,
    includedResources: 9,
    features: [
      "Monitoramento de 5 IAs",
      "Concorrentes ilimitados",
      "Evolução histórica + projeções futuras",
      "Múltiplos workspaces de Slack",
      "Alertas segmentados por área (PR, Marketing, Produto)",
      "Score preditivo de risco reputacional",
      "Webhooks personalizados",
      "SLA dedicado",
    ],
    locked: [],
  },
];

const InvestSection = () => {
  return (
    <section className="py-20 bg-ivero-dark relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-ivero-purple/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            <span className="text-primary-foreground">Nossos </span>
            <span className="text-gradient">Planos</span>
          </h2>
          <p className="text-lg text-ivero-slate-light max-w-2xl mx-auto">
            Escolha o plano ideal e garanta que sua marca seja vista pelas IAs que o mundo usa.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
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
                {/* Header */}
                <div className="mb-5">
                  <h3 className="font-display text-xl font-bold text-primary-foreground mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-ivero-slate-light text-xs mb-3">{plan.tagline}</p>
                  <p className="text-ivero-slate-light/70 text-xs leading-relaxed">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="font-display text-3xl font-bold text-primary-foreground">{plan.price}</span>
                  {plan.period && <span className="text-ivero-slate-light text-sm">{plan.period}</span>}
                </div>

                {/* Recursos Ivero incluídos */}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-ivero-slate-light uppercase tracking-wider mb-3">
                    Recursos Ivero ({plan.includedResources}/9)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_RESOURCES.map((resource, i) => {
                      const included = i < plan.includedResources;
                      return (
                        <span
                          key={resource}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            included
                              ? "bg-accent/15 text-accent border border-accent/30"
                              : "bg-ivero-purple/10 text-ivero-slate-light/40 border border-ivero-purple/15 line-through"
                          }`}
                        >
                          {resource}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Features incluídas */}
                <ul className="space-y-2 mb-5 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-ivero-slate-light">
                      <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}

                  {/* Itens bloqueados */}
                  {plan.locked.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-ivero-slate-light/40">
                      <Lock className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="line-through">{item}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default InvestSection;
