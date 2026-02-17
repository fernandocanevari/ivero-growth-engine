import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="py-10 bg-ivero-dark border-t border-ivero-purple/10">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start justify-center gap-16 mb-8">
          {/* Logo */}
          <div className="flex flex-col gap-3">
            <span className="font-display text-2xl font-bold text-gradient">Ivero</span>
            <Button variant="hero" size="sm" className="px-5 text-xs w-fit" asChild>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
                Fale direto com o fundador
                <ArrowRight className="ml-1 w-3.5 h-3.5" />
              </a>
            </Button>
          </div>

          {/* Mapa do Site */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold text-primary-foreground mb-1">Mapa do Site</h4>
            <a href="#recursos" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Recursos</a>
            <a href="#como-funciona" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Como funciona</a>
            <a href="#para-quem" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Pra quem</a>
            <a href="#precos" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Preços</a>
          </div>

          {/* Redes Sociais */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold text-primary-foreground mb-1">Redes Sociais</h4>
            <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Instagram</a>
            <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">LinkedIn</a>
            <a href="#" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Contato</a>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold text-primary-foreground mb-1">Legal</h4>
            <a href="#" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Termos</a>
            <a href="#" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Privacidade</a>
          </div>
        </div>

        <div className="border-t border-ivero-purple/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
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
