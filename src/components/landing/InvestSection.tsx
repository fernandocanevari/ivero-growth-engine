import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Essencial",
    badge: null,
    tagline: "Ideal para marcas que estão começando",
    price: "Consulte",
    cta: "Começar agora",
    highlighted: false,
    variant: "hero-outline" as const,
  },
  {
    name: "Profissional",
    badge: null,
    tagline: "Ideal para times de marketing ágeis",
    price: "Consulte",
    cta: "Ativar inteligência",
    highlighted: false,
    variant: "hero-outline" as const,
  },
  {
    name: "PRO",
    badge: "🔥 Recomendado",
    tagline: "Ideal para empresas que querem dominar a IA",
    price: "Consulte",
    cta: "Dominar minha presença",
    highlighted: true,
    variant: "hero" as const,
  },
  {
    name: "Enterprise",
    badge: "🔴 Estratégico",
    tagline: "Ideal para quem trata marca como ativo estratégico",
    price: "Custom",
    cta: "Falar com especialista",
    highlighted: false,
    variant: "hero-outline" as const,
  },
];

type FeatureValue = boolean | string;

interface FeatureRow {
  label: string;
  values: [FeatureValue, FeatureValue, FeatureValue, FeatureValue];
}

interface FeatureGroup {
  group: string;
  rows: FeatureRow[];
}

const featureGroups: FeatureGroup[] = [
  {
    group: "Monitoramento",
    rows: [
      { label: "Monitoramento Multi-IA", values: ["2 IAs", "3 IAs", "4 IAs", "5 IAs"] },
      { label: "Concorrentes comparados", values: ["Até 2", "Até 5", "Até 10", "Ilimitados"] },
      { label: "Histórico de menções", values: ["30 dias", "90 dias", "Completo", "Completo + projeções"] },
      { label: "Relatório por e-mail", values: [true, true, true, true] },
    ],
  },
  {
    group: "9 Recursos Ivero",
    rows: [
      { label: "Monitoramento Multi-IA (recurso)", values: [true, true, true, true] },
      { label: "Score GEO de Visibilidade", values: [true, true, true, true] },
      { label: "Dashboard GEO", values: [true, true, true, true] },
      { label: "Análise de Sentimento", values: [false, true, true, true] },
      { label: "Comparativo Competitivo", values: [false, true, true, true] },
      { label: "Mapa de Prompts Estratégicos", values: [false, false, true, true] },
      { label: "Alertas em Tempo Real", values: [false, "Limitado", "Ilimitado", "Ilimitado"] },
      { label: "Dominância por Modelo de IA", values: [false, false, true, true] },
      { label: "Simulador de Influência em IA", values: [false, false, false, true] },
    ],
  },
  {
    group: "Integrações",
    rows: [
      { label: "Alertas no Slack", values: [false, "Limitado", "Ilimitado", "Segmentado"] },
      { label: "Ivero Bot (/status, /concorrente…)", values: [false, false, true, true] },
      { label: "Múltiplos canais Slack", values: [false, false, true, true] },
      { label: "Múltiplos workspaces", values: [false, false, false, true] },
      { label: "Webhooks personalizados", values: [false, false, false, true] },
    ],
  },
  {
    group: "Suporte & SLA",
    rows: [
      { label: "Tendências emergentes", values: [false, false, true, true] },
      { label: "Score preditivo de risco reputacional", values: [false, false, false, true] },
      { label: "Alertas segmentados por área", values: [false, false, false, true] },
      { label: "SLA dedicado", values: [false, false, false, true] },
    ],
  },
];

const Cell = ({ value, highlighted }: { value: FeatureValue; highlighted: boolean }) => {
  const base = highlighted ? "bg-accent/5" : "";
  if (typeof value === "boolean") {
    return (
      <td className={`p-4 text-center ${base}`}>
        {value ? (
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-accent" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-ivero-purple/10 flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-ivero-slate-light/30" />
            </div>
          </div>
        )}
      </td>
    );
  }
  return (
    <td className={`p-4 text-center ${base}`}>
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
        highlighted
          ? "bg-accent/20 text-accent"
          : "bg-ivero-purple/15 text-ivero-slate-light"
      }`}>
        {value}
      </span>
    </td>
  );
};

const InvestSection = () => {
  return (
    <section className="py-20 bg-ivero-dark relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-ivero-purple/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            <span className="text-primary-foreground">Nossos </span>
            <span className="text-gradient">Planos</span>
          </h2>
          <p className="text-lg text-ivero-slate-light max-w-2xl mx-auto">
            Escolha o plano ideal e garanta que sua marca seja vista pelas IAs que o mundo usa.
          </p>
        </motion.div>

        {/* Simplified Cards */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 max-w-7xl mx-auto mb-14">
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
              <div className="p-7 flex flex-col flex-1 items-center text-center">
                <h3 className="font-display text-xl font-bold text-primary-foreground mb-2">
                  {plan.name}
                </h3>
                <p className="text-ivero-slate-light text-xs mb-6 leading-relaxed">{plan.tagline}</p>
                <div className="mb-7">
                  <span className="font-display text-3xl font-bold text-primary-foreground">{plan.price}</span>
                </div>
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

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="max-w-7xl mx-auto overflow-x-auto rounded-2xl border border-ivero-purple/20"
        >
          <table className="w-full text-sm">
            {/* Sticky header with plan names */}
            <thead>
              <tr className="border-b border-ivero-purple/20">
                <th className="text-left p-5 text-ivero-slate-light font-medium w-64 bg-ivero-dark-surface" />
                {plans.map((plan) => (
                  <th
                    key={plan.name}
                    className={`p-5 text-center font-display font-bold text-base ${
                      plan.highlighted
                        ? "bg-accent/10 text-accent"
                        : "bg-ivero-dark-surface text-primary-foreground"
                    }`}
                  >
                    {plan.name}
                    {plan.highlighted && (
                      <span className="block text-[10px] font-normal text-accent/70 mt-0.5 uppercase tracking-wider">
                        Recomendado
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {featureGroups.map((group, gi) => (
                <>
                  {/* Group header */}
                  <tr key={`group-${gi}`}>
                    <td
                      colSpan={5}
                      className="px-5 pt-5 pb-2 text-xs font-bold uppercase tracking-widest text-ivero-purple-light bg-ivero-dark"
                    >
                      {group.group}
                    </td>
                  </tr>

                  {/* Feature rows */}
                  {group.rows.map((row, ri) => (
                    <tr
                      key={`${gi}-${ri}`}
                      className="border-b border-ivero-purple/10 hover:bg-ivero-purple/5 transition-colors"
                    >
                      <td className="p-4 pl-5 text-xs text-ivero-slate-light bg-ivero-dark">
                        {row.label}
                      </td>
                      {row.values.map((val, pi) => (
                        <Cell key={pi} value={val} highlighted={plans[pi].highlighted} />
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>

            {/* CTA footer row */}
            <tfoot>
              <tr className="border-t border-ivero-purple/20">
                <td className="p-5 bg-ivero-dark-surface" />
                {plans.map((plan) => (
                  <td
                    key={plan.name}
                    className={`p-5 text-center ${plan.highlighted ? "bg-accent/10" : "bg-ivero-dark-surface"}`}
                  >
                    <Button
                      variant={plan.variant}
                      size="sm"
                      className={`text-xs px-4 py-4 ${
                        plan.variant === "hero-outline"
                          ? "border-ivero-purple/40 text-ivero-purple-light hover:bg-ivero-purple hover:text-primary-foreground"
                          : ""
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </motion.div>
      </div>
    </section>
  );
};

export default InvestSection;
