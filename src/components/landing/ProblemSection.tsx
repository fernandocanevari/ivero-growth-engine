import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { EyeOff, ShieldAlert, TrendingDown, ArrowRight } from "lucide-react";
import { PROBLEM } from "@/content/landing";

const PROBLEM_ICONS: Record<string, typeof EyeOff> = {
  invisibilidade: EyeOff,
  concorrentes: ShieldAlert,
  decisoes: TrendingDown,
};

const problems = PROBLEM.items.map((item) => ({
  ...item,
  icon: PROBLEM_ICONS[item.key],
}));

const ProblemSection = () => {
  return (
    <section className="py-14 sm:py-16 bg-surface-1">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            {PROBLEM.headline.before}<span className="text-gradient">{PROBLEM.headline.highlight}</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            {PROBLEM.subheadline}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-8 mb-10 sm:mb-16">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="group relative p-6 sm:p-8 rounded-2xl border border-border/60 bg-card hover:border-accent/40 hover:shadow-[0_8px_30px_hsl(330_85%_55%/0.08)] transition-all duration-500 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-ivero-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-accent/5 opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-ivero-gradient flex items-center justify-center mb-5 sm:mb-6 shadow-lg group-hover:shadow-accent/20 group-hover:scale-105 transition-all duration-300">
                  <problem.icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-card-foreground mb-2 sm:mb-3">
                  {problem.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {problem.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Button variant="hero" size="lg" className="text-sm sm:text-base px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto">
            {PROBLEM.ctaLabel}
            <ArrowRight className="ml-2" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default ProblemSection;
