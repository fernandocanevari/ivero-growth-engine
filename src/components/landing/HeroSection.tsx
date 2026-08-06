import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Globe, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { track } from "@/lib/analytics";

const HeroSection = () => {
  const [siteUrl, setSiteUrl] = useState("");
  const navigate = useNavigate();
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const glowPurpleY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const glowPinkY   = useTransform(scrollYProgress, [0, 1], [0, 50]);

  return (
    <section id="diagnostico" ref={sectionRef} className="relative flex items-center overflow-hidden bg-surface-0 scroll-mt-20 min-h-[90vh] lg:min-h-screen">
      {/* Subtle layered background */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-0 via-surface-2 to-surface-0" />
      
      {/* Parallax: glow roxo (suavizado para fundo claro) */}
      <motion.div
        style={{ y: glowPurpleY }}
        className="absolute bottom-0 right-0 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-ivero-purple opacity-[0.06] blur-[120px] pointer-events-none"
      />
      
      {/* Parallax: glow pink */}
      <motion.div
        style={{ y: glowPinkY }}
        className="absolute bottom-[-100px] right-[-50px] w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] rounded-full bg-accent opacity-[0.05] blur-[100px] pointer-events-none"
      />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-24 pb-14 sm:pt-28 sm:pb-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl mx-auto text-center"
        >
          <h1 className="font-display text-[28px] leading-[1.1] sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-5">
            <span className="text-foreground">Sua marca pode estar </span>
            <span className="text-gradient">invisível agora</span>
            <span className="text-foreground"> para o seu cliente e você não sabe.</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-7 sm:mb-9 leading-loose">
            A Ivero mostra como sua marca{" "}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ivero-purple/10 text-ivero-purple align-middle">
              <Radar className="w-3.5 h-3.5 shrink-0" aria-hidden />
              aparece
            </span>{" "}
            nas respostas das IAs, se é{" "}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent align-middle">
              🏆 recomendada
            </span>{" "}
            antes do concorrente, e qual é o seu{" "}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ivero-purple-light/10 text-ivero-purple-light align-middle">
              💡 plano de ação
            </span>{" "}
            pra virar referência.
          </p>




          <div className="flex flex-col gap-2 w-full max-w-xl mx-auto">
            {/* Input pill — empilhado no mobile */}
            <div className="relative group">
              {/* Static glow behind */}
              <div className="absolute -inset-1 rounded-full sm:rounded-full rounded-2xl bg-gradient-to-r from-ivero-purple-light via-accent to-ivero-purple-light opacity-25 blur-md group-hover:opacity-40 group-focus-within:opacity-50 transition-opacity duration-500" />
              <div className="relative flex flex-col sm:flex-row sm:items-center sm:h-14 sm:rounded-full rounded-2xl bg-white border border-ivero-purple/25 overflow-hidden shadow-[0_4px_16px_hsl(265,60%,55%/0.12)] focus-within:shadow-[0_6px_24px_hsl(265,60%,55%/0.18)] transition-shadow duration-300">
                <div className="flex items-center flex-1 min-w-0">
                  <Globe className="hidden sm:block w-4 h-4 text-ivero-purple ml-5 shrink-0" aria-hidden />
                  <input
                    id="hero-site-input"
                    type="url"
                    placeholder="Ex.: www.suaempresa.com.br"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-foreground placeholder:text-muted-foreground text-sm sm:text-base outline-none border-none px-4 pt-4 pb-2 sm:px-3 sm:py-0"
                  />
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  className="text-sm px-5 sm:px-6 h-12 sm:h-14 w-full sm:w-auto rounded-none rounded-b-2xl sm:rounded-none mx-0 shrink-0"
                  onClick={() => {
                    const trimmed = siteUrl.trim();
                    track("hero_cta_clicked", {
                      source: "hero_quick_input",
                      has_site: !!trimmed,
                      site: trimmed || null,
                    });
                    navigate(`/preview${trimmed ? `?url=${encodeURIComponent(trimmed)}` : ""}`);
                  }}
                >
                  Descobrir minha visibilidade agora
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-foreground text-xs sm:text-sm font-medium text-center">
              Diagnóstico instantâneo. Sem cadastro, sem enrolação. ⚡
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
