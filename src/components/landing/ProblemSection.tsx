import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { EyeOff, ShieldAlert, TrendingDown, ArrowRight } from "lucide-react";

const problems = [
  {
    icon: EyeOff,
    title: "Invisibilidade nas IAs",
    description: "Quando alguém pergunta ao ChatGPT, Gemini ou Perplexity sobre seu setor, sua marca simplesmente não aparece.",
  },
  {
    icon: ShieldAlert,
    title: "Concorrentes sendo recomendados",
    description: "Enquanto você não monitora, IAs generativas estão recomendando seus concorrentes em vez da sua marca.",
  },
  {
    icon: TrendingDown,
    title: "Decisões sem dados de IA",
    description: "Sem entender como as IAs percebem sua marca, suas estratégias de conteúdo e posicionamento são cegas.",
  },
];

const ProblemSection = () => {
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
            O problema
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            Sua marca existe para a <span className="text-gradient">IA generativa?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Bilhões de pessoas já usam IAs para tomar decisões. Se sua marca não aparece 
            nessas respostas, você está perdendo relevância todos os dias.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="group p-8 rounded-2xl border border-border bg-card hover:shadow-xl hover:border-accent/30 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-ivero-gradient-soft flex items-center justify-center mb-6 group-hover:glow-pink transition-shadow">
                <problem.icon className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-display text-xl font-semibold text-card-foreground mb-3">
                {problem.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {problem.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Button variant="hero" size="lg" className="text-base px-8 py-6">
            Descubra como sua marca aparece na IA
            <ArrowRight className="ml-2" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default ProblemSection;
