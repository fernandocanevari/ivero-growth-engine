import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="py-12 bg-ivero-dark border-t border-ivero-purple/10">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="font-display text-xl font-bold text-gradient">Ivero</span>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Termos</a>
            <a href="#" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Privacidade</a>
            <a href="#" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Contato</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="/sitemap.xml" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">
              Mapa do Site
            </a>
            <Button variant="hero" size="sm" className="px-5 text-xs" asChild>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
                Fale direto com o fundador
                <ArrowRight className="ml-1 w-3.5 h-3.5" />
              </a>
            </Button>
          </div>
        </div>
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
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
