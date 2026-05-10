import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const aiIcons = [
  { name: "ChatGPT", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openai.svg" },
  { name: "Gemini", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlegemini.svg" },
  { name: "Perplexity", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/perplexity.svg" },
  { name: "Claude", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/anthropic.svg" },
  { name: "Copilot", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/githubcopilot.svg" },
  { name: "Meta AI", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/meta.svg" },
  { name: "Grok", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg" },
];

const NeuralNetwork = () => {
  const count = aiIcons.length;
  const positions = Array.from({ length: count }, (_, i) => ((i + 1) / (count + 1)) * 100);
  const svgWidth = 500;
  const svgHeight = 60;
  const centerX = svgWidth / 2;

  return (
    <div className="flex flex-col items-center max-w-lg w-full mx-auto md:mx-0">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-0">IAs monitoradas</p>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-16"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        {positions.map((pct, i) => {
          const endX = (pct / 100) * svgWidth;
          const cp1X = centerX + (endX - centerX) * 0.3;
          const cp2X = centerX + (endX - centerX) * 0.7;
          return (
            <g key={i}>
              <motion.path
                d={`M ${centerX} 0 C ${cp1X} ${svgHeight * 0.6}, ${cp2X} ${svgHeight * 0.85}, ${endX} ${svgHeight}`}
                stroke="hsl(265, 60%, 45%)"
                strokeWidth="5"
                fill="none"
                animate={{ strokeOpacity: [0.08, 0.2, 0.08] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
              />
              <motion.path
                d={`M ${centerX} 0 C ${cp1X} ${svgHeight * 0.6}, ${cp2X} ${svgHeight * 0.85}, ${endX} ${svgHeight}`}
                stroke="hsl(265, 70%, 28%)"
                strokeWidth="1.5"
                fill="none"
                animate={{ strokeOpacity: [0.4, 0.85, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
              />
              <motion.circle
                cx={endX}
                cy={svgHeight}
                r="2.5"
                fill="hsl(265, 70%, 28%)"
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
              />
            </g>
          );
        })}
        <motion.circle
          cx={centerX}
          cy={0}
          r="3"
          fill="hsl(330, 85%, 55%)"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
      <div className="relative w-full h-8 -mt-1">
        {aiIcons.map((ai, i) => (
          <img
            key={ai.name}
            src={ai.icon}
            alt={ai.name}
            title={ai.name}
            className="absolute w-8 h-8 opacity-70 hover:opacity-100 transition-opacity -translate-x-1/2"
            style={{ left: `${positions[i]}%` }}
          />
        ))}
      </div>
    </div>
  );
};

const Footer = () => {
  return (
    <footer className="py-8 bg-footer-bg border-t border-ivero-purple/15">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Top: mobile stack, desktop row */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-6">
          {/* Branding */}
          <div className="flex flex-col gap-2 shrink-0">
            <span className="font-display text-5xl sm:text-7xl font-bold leading-none" style={{ background: "linear-gradient(90deg, hsl(265, 70%, 50%), hsl(300, 60%, 50%), hsl(330, 85%, 55%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Ivero
            </span>
            <p className="text-base sm:text-lg text-muted-foreground italic">Visibilidade constrói marcas duradoras.</p>
          </div>

          {/* Neural network — oculto no mobile */}
          <div className="hidden md:block w-full max-w-xs lg:max-w-lg mx-auto">
            <NeuralNetwork />
          </div>

          {/* Links — grid 2x2 no mobile, 4 cols no desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm w-full md:w-auto shrink-0">
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-foreground mb-1">Empresa</h4>
              <a href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">Blog</a>
              <a href="/preview" className="text-muted-foreground hover:text-foreground transition-colors">Diagnóstico</a>
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-foreground mb-1">Produto</h4>
              <a href="/#recursos" className="text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
              <a href="/#como-funciona" className="text-muted-foreground hover:text-foreground transition-colors">Como funciona</a>
              <a href="/#para-quem" className="text-muted-foreground hover:text-foreground transition-colors">Para quem</a>
              <a href="/#precos" className="text-muted-foreground hover:text-foreground transition-colors">Preços</a>
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-foreground mb-1">Conta</h4>
              <a href="/auth" className="text-muted-foreground hover:text-foreground transition-colors">Entrar</a>
              <a href="/auth" className="text-muted-foreground hover:text-foreground transition-colors">Criar conta</a>
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-foreground mb-1">Legal</h4>
              <a href="/legal" className="text-muted-foreground hover:text-foreground transition-colors">Central Legal</a>
              <a href="/termos-de-uso" className="text-muted-foreground hover:text-foreground transition-colors">Termos</a>
              <a href="/politica-de-privacidade" className="text-muted-foreground hover:text-foreground transition-colors">Privacidade</a>
              <a href="/politica-de-cookies" className="text-muted-foreground hover:text-foreground transition-colors">Cookies</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-ivero-purple/15 pt-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground text-center md:text-left">© 2026 Ivero. Todos os direitos reservados.</p>
          <div className="flex flex-col items-center md:items-end gap-2">
            <Button variant="hero" size="default" className="px-5 text-sm w-full sm:w-auto" asChild>
              <a href="#">
                Falar com o fundador da Ivero!
                <ArrowRight className="ml-1.5 w-4 h-4" />
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">Feito com o coração ❤️</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
