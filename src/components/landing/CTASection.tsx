import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, TrendingUp, Search, ShoppingCart } from "lucide-react";

const stats = [
  {
    icon: ShoppingCart,
    value: "75%",
    label: "dos consumidores já usam IA para pesquisar antes de comprar",
  },
  {
    icon: Search,
    value: "40%",
    label: "das buscas por produtos começam em IAs generativas",
  },
  {
    icon: TrendingUp,
    value: "3x",
    label: "mais chances de conversão quando a marca é citada pela IA",
  },
];

const CTASection = () => {
  return (
    <section className="py-24 bg-ivero-dark relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-ivero-purple/15 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left column - Market data */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full lg:w-1/3 flex flex-col gap-6"
          >
            <h3 className="font-display text-lg font-semibold text-primary-foreground">
              Dados reais de mercado
            </h3>
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex items-start gap-4 bg-ivero-dark-surface/60 border border-ivero-purple/15 rounded-xl p-4"
              >
                <div className="p-2 rounded-lg bg-accent/10 shrink-0">
                  <stat.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-gradient">{stat.value}</span>
                  <p className="text-sm text-ivero-slate-light mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Right column - CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center flex-1 max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-4 py-1.5 mb-8">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">A era da IA já começou</span>
            </div>

            <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">
              <span className="text-primary-foreground">Sua marca será </span>
              <span className="text-gradient">lembrada ou esquecida?</span>
            </h2>

            <p className="text-lg text-ivero-slate-light mb-10 max-w-xl mx-auto">
              Milhões de decisões de compra já passam pelas IAs generativas. 
              Garanta que sua marca esteja presente quando alguém perguntar.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" className="text-base px-10 py-6">
                Começar agora — é grátis
                <ArrowRight className="ml-2" />
              </Button>
              <Button variant="hero-outline" size="lg" className="text-base px-8 py-6 border-ivero-pink-light/50 text-ivero-pink-light hover:bg-ivero-pink hover:text-primary-foreground">
                Falar com especialista
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
