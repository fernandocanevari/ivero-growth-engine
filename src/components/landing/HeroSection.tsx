import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import heroIllustration from "@/assets/hero-illustration.png";
import { useState } from "react";

const HeroSection = () => {
  const [siteUrl, setSiteUrl] = useState("");

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-ivero-dark">
      {/* Gradient background with subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(230,25%,6%)] via-ivero-dark to-[hsl(230,25%,6%)]" />
      
      {/* Subtle radial glow - purple */}
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-[hsl(265,70%,28%)] opacity-[0.08] blur-[120px]" />
      
      {/* Subtle radial glow - pink/accent */}
      <div className="absolute bottom-[-100px] right-[-50px] w-[400px] h-[400px] rounded-full bg-[hsl(330,85%,55%)] opacity-[0.06] blur-[100px]" />
      
      {/* Subtle light streak */}
      <div className="absolute bottom-0 right-[10%] w-[2px] h-[60%] bg-gradient-to-t from-[hsl(265,60%,55%/0.3)] to-transparent" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Text */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="text-primary-foreground">A sua marca está sendo </span>
              <span className="text-gradient">recomendada</span>
              <br />
              <span className="text-gradient">pelas IAs?</span>
            </h1>

            <p className="text-lg md:text-xl text-ivero-slate-light max-w-2xl mb-10 leading-relaxed">
              A Ivero monitora como sua marca é citada (ou ignorada) por ChatGPT, Gemini, Perplexity 
              e outras IAs — e transforma isso em inteligência estratégica para você agir.
            </p>

            <div className="flex flex-col gap-3 max-w-xl">
              <div className="flex items-center h-14 rounded-full bg-ivero-dark-surface border border-ivero-purple/30 overflow-hidden pl-5 pr-1.5">
                <input
                  type="url"
                  placeholder="Digite o site da sua marca"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  className="flex-1 bg-transparent text-primary-foreground placeholder:text-ivero-slate text-base outline-none border-none"
                />
                <Button variant="hero" size="lg" className="text-sm px-6 h-11 shrink-0 rounded-full">
                  Descubra sua visibilidade em IA
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </Button>
              </div>
              <p className="text-ivero-slate text-sm ml-5">Digite o site da sua marca e eu darei uma análise gratuita 🚀</p>
            </div>
          </motion.div>

          {/* Right - Illustration */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="hidden lg:flex justify-center"
          >
            <img
              src={heroIllustration}
              alt="Dashboard de monitoramento de marca em IAs generativas"
              className="w-full max-w-lg drop-shadow-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
