import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Search, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CTA_SECTION } from "@/content/landing";

const STAT_ICONS: Record<string, typeof TrendingUp> = {
  consumidores: ShoppingCart,
  buscas: Search,
  conversao: TrendingUp,
};

const stats = CTA_SECTION.stats.map((stat) => ({ ...stat, icon: STAT_ICONS[stat.key] }));

const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section className="py-14 sm:py-16 bg-surface-0 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-ivero-purple/8 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full lg:w-1/3 flex flex-col gap-4 sm:gap-6"
          >
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex items-start gap-3 sm:gap-4 bg-surface-2 border border-ivero-purple/15 rounded-xl p-3 sm:p-4 shadow-sm"
              >
                <div className="p-2 rounded-lg bg-accent/10 shrink-0">
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-bold text-gradient">{stat.value}</span>
                  <p className="text-sm sm:text-base text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center flex-1 max-w-2xl"
          >
            <h2 className="font-display text-3xl sm:text-4xl md:text-6xl font-bold mb-5 sm:mb-6">
              <span className="text-foreground">{CTA_SECTION.headline.before}</span>
              <span className="text-gradient">{CTA_SECTION.headline.highlight}</span>
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto">
              {CTA_SECTION.paragraph}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" className="text-sm sm:text-base px-8 sm:px-10 py-5 sm:py-6 w-full sm:w-auto" onClick={() => navigate("/auth")}>
                {CTA_SECTION.ctaLabel}
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
