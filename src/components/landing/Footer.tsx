import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const aiIcons = [
  { name: "ChatGPT", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openai.svg" },
  { name: "Gemini", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlegemini.svg" },
  { name: "Perplexity", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/perplexity.svg" },
  { name: "Claude", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/anthropic.svg" },
  { name: "Copilot", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/githubcopilot.svg" },
  { name: "Meta AI", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/meta.svg" },
  { name: "Grok", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg" },
];

const Footer = () => {
  return (
    <footer className="py-4 bg-ivero-dark border-t border-ivero-purple/10">
      <div className="container mx-auto px-6">
        {/* Top: centered branding block */}
        <div className="flex flex-col items-center gap-1.5 mb-3">
          <span className="font-display text-2xl font-bold text-gradient">Ivero</span>
          <p className="text-[10px] text-ivero-slate-light uppercase tracking-wider">IAs monitoradas</p>
          <div className="flex items-center justify-center gap-3">
            {aiIcons.map((ai) => (
              <img
                key={ai.name}
                src={ai.icon}
                alt={ai.name}
                title={ai.name}
                className="w-5 h-5 invert opacity-70 hover:opacity-100 transition-opacity"
              />
            ))}
          </div>
          <p className="text-xs text-ivero-slate-light italic">Visibilidade constrói marcas duradoras.</p>
        </div>

        {/* Links row */}
        <div className="flex flex-wrap items-start justify-center gap-10 mb-3 text-xs">
          <div className="flex flex-col gap-0.5">
            <h4 className="font-semibold text-primary-foreground mb-0.5">Mapa do Site</h4>
            <a href="#recursos" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Recursos</a>
            <a href="#como-funciona" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Como funciona</a>
            <a href="#para-quem" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Pra quem</a>
            <a href="#precos" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Preços</a>
          </div>
          <div className="flex flex-col gap-0.5">
            <h4 className="font-semibold text-primary-foreground mb-0.5">Redes Sociais</h4>
            <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Instagram</a>
            <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">LinkedIn</a>
            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">WhatsApp</a>
            <a href="#" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Contato</a>
          </div>
          <div className="flex flex-col gap-0.5">
            <h4 className="font-semibold text-primary-foreground mb-0.5">Legal</h4>
            <a href="#" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Termos</a>
            <a href="#" className="text-ivero-slate-light hover:text-primary-foreground transition-colors">Privacidade</a>
          </div>
        </div>

        {/* CTA button */}
        <div className="flex justify-center mb-2">
          <Button variant="hero" size="default" className="px-6 text-sm" asChild>
            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
              Fale direto com o fundador, o Fernando!
              <ArrowRight className="ml-1.5 w-4 h-4" />
            </a>
          </Button>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-ivero-purple/10 pt-2 flex flex-col md:flex-row items-center justify-between gap-1">
          <p className="text-xs text-ivero-slate-light">© 2026 Ivero. Todos os direitos reservados.</p>
          <p className="text-xs text-ivero-slate-light">Feito com o coração ❤️</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;