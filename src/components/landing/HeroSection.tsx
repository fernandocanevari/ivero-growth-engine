import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="Ivero GeoIntelligence visualization" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-ivero-dark/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-ivero-dark/50 via-transparent to-ivero-dark" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full bg-ivero-purple/20 border border-ivero-purple/30 px-4 py-1.5 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-medium text-ivero-pink-light">Geointeligência & Otimização de Crescimento</span>
          </motion.div>

          <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6">
            <span className="text-primary-foreground">Domine o mercado com </span>
            <span className="text-gradient">dados inteligentes</span>
          </h1>

          <p className="text-lg md:text-xl text-ivero-slate-light max-w-2xl mb-10 leading-relaxed">
            A Ivero transforma dados geográficos e de mercado em estratégias de crescimento 
            acionáveis. Descubra oportunidades invisíveis e escale sua marca com precisão.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="hero" size="lg" className="text-base px-8 py-6">
              Comece gratuitamente
              <ArrowRight className="ml-2" />
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base px-8 py-6 border-ivero-pink-light/50 text-ivero-pink-light hover:bg-ivero-pink hover:text-primary-foreground">
              Agendar demo
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
