import { motion } from "framer-motion";
import { Scan, BarChart3, Rocket } from "lucide-react";
import { STEPS } from "@/content/landing";

const STEP_ICONS: Record<string, typeof Scan> = {
  monitorar: Scan,
  analisar: BarChart3,
  agir: Rocket,
};

const steps = STEPS.items.map((step) => ({ ...step, icon: STEP_ICONS[step.key] }));

const StepsSection = () => {
  return (
    <section className="py-14 sm:py-16 bg-surface-2 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-ivero-purple/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-20"
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            <span className="text-foreground">3 passos para </span>
            <span className="text-gradient">dominar a IA</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8 md:gap-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative group"
            >
              {/* Conector horizontal — só desktop */}
              {index < 2 && (
                <div className="hidden sm:block absolute top-10 left-[calc(50%+48px)] right-[calc(-50%+48px)] h-[2px] bg-gradient-to-r from-accent/60 via-accent/30 to-accent/60 z-0 shadow-[0_0_8px_hsl(330_85%_55%/0.4)]" />
              )}
              {/* Conector vertical — só mobile */}
              {index < 2 && (
                <div className="sm:hidden absolute left-10 top-[80px] w-[2px] h-[calc(100%+24px)] bg-gradient-to-b from-accent/60 via-accent/30 to-accent/10" />
              )}

              <div className="relative z-10 text-center sm:text-center flex sm:block items-start sm:items-center gap-5 sm:gap-0">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-ivero-purple/20 shrink-0 mb-0 sm:mb-6 group-hover:border-accent/50 shadow-sm transition-all duration-300">
                  <step.icon className="w-7 h-7 sm:w-9 sm:h-9 text-accent" />
                </div>
                <div className="text-left sm:text-center">
                  <span className="block text-xs sm:text-sm font-bold text-ivero-purple-light mb-1 sm:mb-2 tracking-widest">
                    PASSO {step.number}
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground mb-2 sm:mb-4">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StepsSection;
