import { motion } from "framer-motion";
import { Bot, GitCompare, TrendingUp, Shield, FileText, Bell } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Monitoramento Multi-IA",
    description: "Rastreie menções da sua marca no ChatGPT, Gemini, Perplexity, Claude e outros motores generativos simultaneamente.",
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
    <section className="py-16 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            Recursos da Ivero para{" "}
            <span className="text-gradient">a presença da sua marca nas IAs</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-8 rounded-2xl border border-border/60 bg-card hover:border-accent/40 hover:shadow-[0_8px_30px_hsl(330_85%_55%/0.08)] transition-all duration-500 overflow-hidden"
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-ivero-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Soft radial glow on hover */}
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-accent/5 opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-ivero-gradient flex items-center justify-center mb-6 shadow-lg group-hover:shadow-accent/20 group-hover:scale-105 transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-bold text-card-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
