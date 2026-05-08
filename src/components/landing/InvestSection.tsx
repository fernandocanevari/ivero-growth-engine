import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Cpu, Bell, Search, BarChart2, Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const planFeatures: Record<string, string[]> = {
  Presença: [
    "Score GEO de Visibilidade",
    "Monitoramento em 2 IAs (ChatGPT + Gemini)",
    "10 prompts monitorados",
    "500 consultas/mês",
    "50 avisos/mês por e-mail",
    "Relatório semanal automatizado",
    "Dashboard GEO completo",
    "Suporte prioritário por e-mail",
  ],
  Influência: [
    "Tudo do Presença +",
    "Monitoramento em 3 IAs (+ Perplexity)",
    "30 prompts monitorados",
    "2.000 consultas/mês",
    "200 avisos/mês",
    "Análise de Sentimento por IA",
    "Análise Comparativa com concorrentes",
    "Tags de Percepção (verde/amarelo/vermelho)",
  ],
  Autoridade: [
    "Tudo do Influência +",
    "Monitoramento em 4 IAs (+ Claude)",
    "100 prompts monitorados",
    "10.000 consultas/mês",
    "Avisos ilimitados",
    "Mapa de Prompts Estratégicos",
    "Plano de Ação Estratégico personalizado",
    "Gerador de Conteúdo GEO (Artigo + FAQ)",
    "Histórico de auditorias completo",
  ],
  Domínio: [
    "Tudo do Autoridade +",
    "Monitoramento em 5 IAs (+ GPT-5)",
    "Prompts e consultas ilimitados",
    "Dominância por Modelo de IA",
    "Simulador de Influência em IA",
    "Evolução Estratégica com radar e KPIs",
    "Onboarding dedicado e Account Manager",
    "SLA premium e integrações sob demanda",
  ],
};

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
              <span className="text-[10px] font-bold bg-accent/15 text-accent border border-accent/30 px-1.5 py-0.5 rounded-full">
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

        {/* Rodapé comum */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 sm:mt-10 text-center space-y-2 sm:space-y-3 px-2"
        >
          <p className="text-xs sm:text-sm font-semibold text-foreground">
            <span className="text-accent font-bold">✦</span>{" "}
            Cada plano inclui todos os recursos do anterior, mais os seus exclusivos.
          </p>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-4xl mx-auto">
            <span className="text-accent font-bold">✦</span>{" "}
            <span className="font-semibold text-foreground">Incluso em todos os planos:</span>{" "}
            Dashboard GEO · Score de Visibilidade · Análise Comparativa · Suporte prioritário · Sem contrato · Cancele quando quiser
          </p>
        </motion.div>

        {/* Acordeão: detalhes por plano */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4 }}
          className="mt-10 sm:mt-14 max-w-3xl mx-auto px-2"
        >
          <div className="text-center mb-5 sm:mb-6">
            <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              Veja tudo que está incluso em cada plano
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Clique no plano para expandir os detalhes.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-2 sm:space-y-3">
            {Object.entries(planFeatures).map(([planName, features]) => {
              const isHighlighted = planName === "Autoridade";
              return (
                <AccordionItem
                  key={planName}
                  value={planName}
                  className={`rounded-xl border bg-white px-4 sm:px-5 transition-colors ${
                    isHighlighted
                      ? "border-accent/40 hover:border-accent/60"
                      : "border-ivero-purple/20 hover:border-ivero-purple/40"
                  }`}
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isHighlighted ? "bg-accent" : "bg-ivero-purple-light"
                        }`}
                      />
                      <span className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-foreground">
                        {planName}
                      </span>
                      {isHighlighted && (
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/30 px-2 py-0.5 rounded-full">
                          Recomendado
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2 pt-1">
                      {features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-xs sm:text-sm text-foreground/85"
                        >
                          <Check
                            className={`shrink-0 w-4 h-4 mt-0.5 ${
                              isHighlighted ? "text-accent" : "text-ivero-purple-light"
                            }`}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </motion.div>

        {/* Comparativo lado a lado */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4 }}
          className="mt-12 sm:mt-16 max-w-6xl mx-auto"
        >
          <div className="text-center mb-6 sm:mb-8 px-2">
            <span className="inline-block text-[10px] sm:text-xs font-bold uppercase tracking-widest text-accent mb-2">
              Comparar planos
            </span>
            <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              A diferença principal entre cada plano
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
              Use este resumo para identificar rapidamente em qual estágio a sua marca está e o próximo nível a conquistar.
            </p>
          </div>

          {/* Mobile: cards empilhados */}
          <div className="grid grid-cols-1 sm:hidden gap-3 px-2">
            {[
              { name: "Presença", color: "ivero-purple", focus: "Visibilidade básica", diff: "Você descobre se as IAs te conhecem.", best: "Marcas iniciando em GEO" },
              { name: "Influência", color: "ivero-purple", focus: "Comparação ativa", diff: "Você entende como aparece vs. concorrentes.", best: "Marcas com concorrência direta em IA" },
              { name: "Autoridade", color: "accent", focus: "Ação estratégica", diff: "Você executa um plano para dominar prompts-chave.", best: "Marcas que querem virar referência", highlight: true },
              { name: "Domínio", color: "accent", focus: "Liderança total", diff: "Você opera com inteligência preditiva e simulações.", best: "Líderes de mercado e enterprise" },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-xl border bg-white p-4 ${
                  p.highlight ? "border-accent/50 shadow-md shadow-accent/10" : "border-ivero-purple/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-display text-sm font-bold uppercase tracking-wider ${
                    p.color === "accent" ? "text-accent" : "text-ivero-purple"
                  }`}>
                    {p.name}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {p.focus}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground mb-1.5">{p.diff}</p>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold">Ideal para:</span> {p.best}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop/tablet: tabela */}
          <div className="hidden sm:block overflow-hidden rounded-2xl border border-ivero-purple/20 bg-white shadow-lg shadow-ivero-purple/5">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gradient-to-r from-ivero-purple/8 via-white to-accent/8 border-b border-ivero-purple/15">
                  <th className="py-4 px-5 text-xs font-bold uppercase tracking-wider text-muted-foreground w-[160px]">
                    Critério
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-ivero-purple text-center">
                    Presença
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-ivero-purple text-center">
                    Influência
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-accent text-center bg-accent/5 relative">
                    Autoridade
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-accent/80 mt-0.5">
                      ★ Recomendado
                    </span>
                  </th>
                  <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-accent text-center">
                    Domínio
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  {
                    label: "Foco principal",
                    rows: ["Visibilidade", "Comparação", "Ação estratégica", "Liderança total"],
                  },
                  {
                    label: "Diferencial-chave",
                    rows: [
                      "Descobre se as IAs te conhecem",
                      "Compara você vs. concorrentes",
                      "Executa plano para dominar prompts-chave",
                      "Inteligência preditiva e simulações",
                    ],
                  },
                  {
                    label: "IAs monitoradas",
                    rows: ["2", "3", "4", "5 (todas)"],
                  },
                  {
                    label: "Prompts monitorados",
                    rows: ["10", "30", "100", "Ilimitados"],
                  },
                  {
                    label: "Ideal para",
                    rows: [
                      "Marcas iniciando em GEO",
                      "Marcas com concorrência direta",
                      "Marcas que querem virar referência",
                      "Líderes de mercado / enterprise",
                    ],
                  },
                ].map((row, idx) => (
                  <tr
                    key={row.label}
                    className={`border-b border-ivero-purple/10 last:border-b-0 ${
                      idx % 2 === 1 ? "bg-surface-1/40" : ""
                    }`}
                  >
                    <td className="py-3.5 px-5 font-semibold text-foreground text-xs uppercase tracking-wider">
                      {row.label}
                    </td>
                    {row.rows.map((cell, i) => (
                      <td
                        key={i}
                        className={`py-3.5 px-4 text-center text-xs sm:text-sm ${
                          i === 2
                            ? "bg-accent/5 text-foreground font-semibold"
                            : "text-foreground/80"
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-[11px] sm:text-xs text-muted-foreground mt-4 italic px-2">
            Cada plano herda todos os recursos do anterior — você nunca perde o que já conquistou.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default InvestSection;
