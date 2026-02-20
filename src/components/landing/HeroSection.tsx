import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";

const HeroSection = () => {
  const [siteUrl, setSiteUrl] = useState("");
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const glowPurpleY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const glowPinkY   = useTransform(scrollYProgress, [0, 1], [0, 50]);
  const streakY     = useTransform(scrollYProgress, [0, 1], [0, -40]);

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center overflow-hidden bg-ivero-dark">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(230,25%,6%)] via-ivero-dark to-[hsl(230,25%,6%)]" />
      
      {/* Parallax: glow roxo */}
      <motion.div
        style={{ y: glowPurpleY }}
        className="absolute bottom-0 right-0 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-[hsl(265,70%,28%)] opacity-[0.08] blur-[120px] pointer-events-none"
      />
      
      {/* Parallax: glow pink */}
      <motion.div
        style={{ y: glowPinkY }}
        className="absolute bottom-[-100px] right-[-50px] w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] rounded-full bg-[hsl(330,85%,55%)] opacity-[0.06] blur-[100px] pointer-events-none"
      />
      
      {/* Parallax: light streak */}
      <motion.div
        style={{ y: streakY }}
        className="absolute bottom-0 right-[10%] w-[2px] h-[60%] bg-gradient-to-t from-[hsl(265,60%,55%/0.3)] to-transparent pointer-events-none"
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-28 pb-16 sm:py-32 sm:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-start">
          {/* Left - Text */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-5 sm:mb-6">
              <span className="text-primary-foreground">A sua marca está </span>
              <span className="whitespace-nowrap"><span className="text-primary-foreground">sendo </span><span className="text-gradient">recomendada</span></span>
              <br />
              <span className="text-gradient">pelas IAs?</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-ivero-slate-light max-w-2xl mb-8 sm:mb-10 leading-relaxed">
              A Ivero monitora como sua marca é citada (ou ignorada) por ChatGPT, Gemini, Perplexity 
              e outras IAs — e transforma isso em inteligência estratégica para você agir.
            </p>

            <div className="flex flex-col gap-3 w-full">
              {/* Input pill — empilhado no mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:h-14 sm:rounded-full rounded-2xl bg-ivero-dark-surface border border-ivero-purple/30 overflow-hidden shadow-[0_0_20px_hsl(265,60%,55%/0.25),0_0_60px_hsl(265,60%,55%/0.1)] focus-within:shadow-[0_0_25px_hsl(265,60%,55%/0.35),0_0_80px_hsl(265,60%,55%/0.15)] transition-shadow duration-300">
                <input
                  type="url"
                  placeholder="Digite o site da sua marca"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  className="flex-1 bg-transparent text-primary-foreground placeholder:text-ivero-slate text-sm sm:text-base outline-none border-none px-4 pt-4 pb-2 sm:px-5 sm:py-0"
                />
                <Button variant="hero" size="lg" className="text-sm px-5 sm:px-6 h-12 sm:h-14 w-full sm:w-auto rounded-none rounded-b-2xl sm:rounded-none mx-0 shrink-0">
                  Descubra sua visibilidade em IA
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </Button>
              </div>
              <p className="text-primary-foreground text-sm sm:text-base font-medium ml-1 sm:ml-5">
                Veja análise instantânea da sua presença nas respostas da IA 🚀
              </p>
            </div>
          </motion.div>

          {/* Right - Signup Form (desktop only) */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="hidden lg:flex justify-center -mt-2"
          >
            <div className="w-full max-w-md bg-ivero-dark-surface border border-ivero-purple/20 rounded-2xl p-8 shadow-xl">
              <h3 className="font-display text-xl font-semibold text-primary-foreground mb-2">
                Descubra se sua marca já aparece nas respostas da IA.
              </h3>
              <p className="text-ivero-slate-light text-sm mb-6">Preencha os dados abaixo e comece agora.</p>

              <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="text"
                  placeholder="Nome"
                  className="h-12 rounded-lg bg-ivero-dark border border-ivero-purple/20 px-4 text-primary-foreground placeholder:text-ivero-slate text-sm outline-none focus:border-ivero-purple/50 transition-colors"
                />
                <input
                  type="email"
                  placeholder="E-mail corporativo"
                  className="h-12 rounded-lg bg-ivero-dark border border-ivero-purple/20 px-4 text-primary-foreground placeholder:text-ivero-slate text-sm outline-none focus:border-ivero-purple/50 transition-colors"
                />
                <input
                  type="url"
                  placeholder="Site da empresa"
                  className="h-12 rounded-lg bg-ivero-dark border border-ivero-purple/20 px-4 text-primary-foreground placeholder:text-ivero-slate text-sm outline-none focus:border-ivero-purple/50 transition-colors"
                />
                <input
                  type="tel"
                  placeholder="Celular"
                  className="h-12 rounded-lg bg-ivero-dark border border-ivero-purple/20 px-4 text-primary-foreground placeholder:text-ivero-slate text-sm outline-none focus:border-ivero-purple/50 transition-colors"
                />
                <Button variant="hero" size="lg" className="w-full h-12 text-base mt-2">
                  Começar agora
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
