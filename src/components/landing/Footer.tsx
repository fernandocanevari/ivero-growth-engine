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
      <p className="text-sm font-semibold text-ivero-slate-light uppercase tracking-widest mb-0">IAs monitoradas</p>
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
                stroke="hsl(0, 0%, 75%)"
                strokeWidth="5"
                fill="none"
                animate={{ strokeOpacity: [0.08, 0.2, 0.08] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
              />
              <motion.path
                d={`M ${centerX} 0 C ${cp1X} ${svgHeight * 0.6}, ${cp2X} ${svgHeight * 0.85}, ${endX} ${svgHeight}`}
                stroke="hsl(0, 0%, 70%)"
                strokeWidth="1.5"
                fill="none"
                animate={{ strokeOpacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
              />
              <motion.circle
                cx={endX}
                cy={svgHeight}
                r="2.5"
                fill="hsl(0, 0%, 75%)"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
              />
            </g>
          );
        })}
        <motion.circle
          cx={centerX}
          cy={0}
          r="3"
          fill="hsl(0, 0%, 80%)"
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
      {/* Icons positioned to match SVG endpoints */}
      <div className="relative w-full h-8 -mt-1">
        {aiIcons.map((ai, i) => (
          <img
            key={ai.name}
            src={ai.icon}
            alt={ai.name}
            title={ai.name}
            className="absolute w-8 h-8 invert opacity-70 hover:opacity-100 transition-opacity -translate-x-1/2"
            style={{ left: `${positions[i]}%` }}
          />
        ))}
      </div>
    </div>
  );
};

const Footer = () => {
  return (
    <footer className="py-8 bg-ivero-dark border-t border-ivero-purple/10">
      <div className="container mx-auto px-6">
        {/* Top row: Ivero left, neural center, links right */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-6">
          {/* Left - Branding */}
          <div className="flex flex-col gap-2 shrink-0">
            <span className="font-display text-7xl font-bold leading-none" style={{ background: "linear-gradient(90deg, hsl(265, 70%, 50%), hsl(300, 60%, 50%), hsl(330, 85%, 55%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Ivero
            </span>
            <p className="text-lg text-ivero-slate-light italic">Visibilidade constrói marcas duradoras.</p>
          </div>

          {/* Center - Neural network */}
          <NeuralNetwork />

          {/* Right - Links */}
          <div className="flex flex-wrap gap-8 text-sm shrink-0">
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-primary-foreground mb-1">Empresa</h4>
              <a href="#" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Sobre</a>
              <a href="#" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Blog</a>
              <a href="#" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Contato</a>
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-primary-foreground mb-1">Produto</h4>
              <a href="#recursos" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Recursos</a>
              <a href="#como-funciona" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Como funciona</a>
              <a href="#para-quem" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Pra quem</a>
              <a href="#precos" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Preços</a>
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-primary-foreground mb-1">Redes Sociais</h4>
              <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Instagram</a>
              <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">LinkedIn</a>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">WhatsApp</a>
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-primary-foreground mb-1">Legal</h4>
              <a href="#" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Termos</a>
              <a href="#" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Privacidade</a>
              <a href="#" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">LGPD</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-ivero-purple/10 pt-3 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-ivero-slate-light">© 2026 Ivero. Todos os direitos reservados.</p>
          <div className="flex flex-col items-end gap-2">
            <Button variant="hero" size="default" className="px-6 text-sm" asChild>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
                Fale direto com o fundador, o Fernando!
                <ArrowRight className="ml-1.5 w-4 h-4" />
              </a>
            </Button>
            <p className="text-xs text-ivero-slate-light">Feito com o coração ❤️</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
