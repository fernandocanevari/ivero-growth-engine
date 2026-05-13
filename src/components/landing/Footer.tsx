import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
