import { motion } from "framer-motion";
import { Globe, Brain, Zap, Shield, LineChart, Users } from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Mapeamento Geográfico",
    description: "Visualize dados de mercado em mapas interativos com camadas de informação personalizáveis.",
  },
  {
    icon: Brain,
    title: "IA Preditiva",
    description: "Algoritmos que antecipam tendências e identificam janelas de oportunidade antes da concorrência.",
  },
  {
    icon: Zap,
    title: "Automação GEO",
    description: "Otimize automaticamente seus mecanismos de crescimento com base em dados geográficos em tempo real.",
  },
  {
    icon: Shield,
    title: "Análise Competitiva",
    description: "Monitore concorrentes, market share e movimentos de mercado com dashboards inteligentes.",
  },
  {
    icon: LineChart,
    title: "Growth Analytics",
    description: "Métricas de crescimento avançadas com relatórios customizáveis e exportáveis.",
  },
  {
    icon: Users,
    title: "Segmentação Inteligente",
    description: "Descubra clusters de audiência de alta conversão com segmentação geodemográfica.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-accent mb-4 block">
            Recursos
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            Tudo que você precisa para{" "}
            <span className="text-gradient">impulsionar sua marca</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ferramentas poderosas de geointeligência integradas em uma única plataforma.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-8 rounded-2xl border border-border bg-card hover:border-accent/30 transition-all duration-300 overflow-hidden"
            >
              {/* Gradient hover effect */}
              <div className="absolute inset-0 bg-ivero-gradient-soft opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-ivero-gradient-soft flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-display text-lg font-semibold text-card-foreground mb-2">
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
