import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="py-4 bg-ivero-dark border-t border-ivero-purple/10">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start justify-center gap-12 mb-4">
          {/* Logo */}
          <div className="flex flex-col gap-3">
            <span className="font-display text-5xl font-bold text-gradient">Ivero</span>
            <p className="text-sm text-ivero-slate-light italic">Visibilidade constrói marcas duradoras.</p>
            <Button variant="hero" size="default" className="px-6 text-sm w-fit" asChild>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
                Fale direto com o fundador, o Fernando!
                <ArrowRight className="ml-1.5 w-4 h-4" />
              </a>
            </Button>
            
            {/* IAs monitoradas */}
            <div className="mt-3">
              <p className="text-xs text-ivero-slate-light uppercase tracking-wider mb-2">IAs monitoradas</p>
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { name: "ChatGPT", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openai.svg" },
                  { name: "Gemini", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlegemini.svg" },
                  { name: "Perplexity", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/perplexity.svg" },
                  { name: "Claude", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/anthropic.svg" },
                  { name: "Copilot", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/githubcopilot.svg" },
                  { name: "Meta AI", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/meta.svg" },
                  { name: "Grok", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg" },
                ].map((ai) => (
                  <img
                    key={ai.name}
                    src={ai.icon}
                    alt={ai.name}
                    title={ai.name}
                    className="w-6 h-6 invert opacity-70 hover:opacity-100 transition-opacity"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Mapa do Site */}
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold text-primary-foreground mb-0.5">Mapa do Site</h4>
            <a href="#recursos" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Recursos</a>
            <a href="#como-funciona" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Como funciona</a>
            <a href="#para-quem" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Pra quem</a>
            <a href="#precos" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Preços</a>
          </div>

          {/* Redes Sociais */}
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold text-primary-foreground mb-0.5">Redes Sociais</h4>
            <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Instagram</a>
            <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">LinkedIn</a>
            <a href="#" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Contato</a>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold text-primary-foreground mb-0.5">Legal</h4>
            <a href="#" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Termos</a>
            <a href="#" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Privacidade</a>
          </div>
        </div>

        <div className="border-t border-ivero-purple/10 pt-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-sm text-ivero-slate-light">
            © 2026 Ivero. Todos os direitos reservados.
          </p>
          <p className="text-sm text-ivero-slate-light">
            Feito com o coração ❤️
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
