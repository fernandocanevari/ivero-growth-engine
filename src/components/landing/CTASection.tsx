import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 bg-ivero-dark relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-ivero-purple/15 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-4 py-1.5 mb-8">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Oferta por tempo limitado</span>
          </div>

          <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">
            <span className="text-primary-foreground">Pronto para </span>
            <span className="text-gradient">transformar seu crescimento?</span>
          </h2>

          <p className="text-lg text-ivero-slate-light mb-10 max-w-xl mx-auto">
            Junte-se a centenas de marcas que já usam a Ivero para tomar decisões 
            baseadas em dados e escalar com confiança.
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
    </section>
  );
};

export default CTASection;
