import { motion } from "framer-motion";
import { Bot, GitCompare, TrendingUp, Shield, FileText, Bell } from "lucide-react";

const MiniDashboard = () => (
  <div className="w-full space-y-3">
    {/* Mini bar chart */}
    <div className="flex items-end gap-2 h-24">
      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: "easeOut" }}
          className="flex-1 rounded-t-sm bg-gradient-to-t from-ivero-purple to-accent/80"
        />
      ))}
    </div>
    {/* Labels */}
    <div className="flex justify-between text-[10px] text-ivero-slate-light">
      <span>ChatGPT</span>
      <span>Gemini</span>
      <span>Claude</span>
      <span>Perplexity</span>
    </div>
    {/* Stats row */}
    <div className="flex gap-3 pt-2">
      <div className="flex-1 rounded-lg bg-ivero-purple/15 border border-ivero-purple/20 p-2.5 text-center">
        <div className="text-lg font-bold text-accent">87%</div>
        <div className="text-[10px] text-ivero-slate-light">Visibilidade</div>
      </div>
      <div className="flex-1 rounded-lg bg-ivero-purple/15 border border-ivero-purple/20 p-2.5 text-center">
        <div className="text-lg font-bold text-primary-foreground">+24%</div>
        <div className="text-[10px] text-ivero-slate-light">vs Mês anterior</div>
      </div>
    </div>
  </div>
);

const features = [
  {
    icon: Bot,
    title: "Monitoramento Multi-IA",
    description: "Rastreie menções da sua marca no ChatGPT, Gemini, Perplexity, Claude e outros motores generativos simultaneamente.",
    hero: true,
  },
  {
    icon: GitCompare,
    title: "Análise Comparativa",
    description: "Compare sua visibilidade com concorrentes diretos. Saiba quem está sendo recomendado e por quê.",
  },
  {
    icon: TrendingUp,
    title: "Score de Visibilidade GEO",
    description: "Métrica proprietária que quantifica o quão presente e bem posicionada sua marca está nas respostas de IA.",
  },
  {
    icon: Shield,
    title: "Análise de Sentimento",
    description: "Entenda se a IA fala da sua marca de forma positiva, neutra ou negativa — e o que influencia esse tom.",
  },
  {
    icon: FileText,
    title: "Planos de Ação Estratégicos",
    description: "Receba recomendações prescritivas de conteúdo, SEO e posicionamento para melhorar sua presença em IA.",
  },
  {
    icon: Bell,
    title: "Alertas em Tempo Real",
    description: "Seja notificado quando houver mudanças na forma como IAs citam sua marca ou seus concorrentes.",
  },
];

const FeaturesSection = () => {
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
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            <span className="text-primary-foreground">Recursos da Ivero para </span>
            <span className="text-gradient">a presença da sua marca nas IAs</span>
          </h2>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => {
            const isHero = feature.hero;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className={`group relative rounded-2xl border border-ivero-purple/15 bg-ivero-dark-surface hover:border-accent/30 transition-all duration-500 overflow-hidden ${
                  isHero ? "md:col-span-2 md:row-span-2 p-8 md:p-10" : "p-7"
                }`}
              >
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-ivero-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Glow on hover */}
                <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-accent/5 opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-700" />

                <div className="relative z-10 h-full flex flex-col">
                  <div className={`w-12 h-12 rounded-xl bg-ivero-gradient flex items-center justify-center mb-5 shadow-lg group-hover:shadow-accent/20 group-hover:scale-105 transition-all duration-300 ${isHero ? "w-14 h-14" : ""}`}>
                    <feature.icon className={`text-primary-foreground ${isHero ? "w-7 h-7" : "w-5 h-5"}`} />
                  </div>

                  <h3 className={`font-display font-bold text-primary-foreground mb-3 ${isHero ? "text-2xl md:text-3xl" : "text-lg"}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-ivero-slate-light leading-relaxed ${isHero ? "text-base mb-8 max-w-md" : "text-sm"}`}>
                    {feature.description}
                  </p>

                  {isHero && (
                    <div className="mt-auto">
                      <MiniDashboard />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
