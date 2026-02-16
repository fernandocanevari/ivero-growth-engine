import { motion } from "framer-motion";
import { MapPin, BarChart3, Rocket } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MapPin,
    title: "Conecte seus dados",
    description: "Integre suas fontes de dados em minutos. A Ivero coleta informações geográficas, de mercado e comportamentais automaticamente.",
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Analise com inteligência",
    description: "Nossa IA processa milhões de dados e gera insights visuais sobre oportunidades de crescimento, concorrência e tendências.",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Escale com precisão",
    description: "Receba recomendações acionáveis e otimize seus mecanismos de crescimento com dados reais, não suposições.",
  },
];

const StepsSection = () => {
  return (
    <section className="py-24 bg-ivero-dark relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-ivero-purple/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-accent mb-4 block">
            Como funciona
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            <span className="text-primary-foreground">3 passos para </span>
            <span className="text-gradient">dominar o mercado</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative group"
            >
              {/* Connector line */}
              {index < 2 && (
                <div className="hidden md:block absolute top-16 left-full w-full h-px bg-gradient-to-r from-ivero-purple/40 to-accent/40 z-0" />
              )}
              
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-ivero-dark-surface border border-ivero-purple/30 mb-6 group-hover:border-accent/50 group-hover:glow-purple transition-all duration-300">
                  <step.icon className="w-9 h-9 text-accent" />
                </div>
                <span className="block text-sm font-bold text-ivero-purple-light mb-2 tracking-widest">
                  PASSO {step.number}
                </span>
                <h3 className="font-display text-2xl font-semibold text-primary-foreground mb-4">
                  {step.title}
                </h3>
                <p className="text-ivero-slate-light leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StepsSection;
