import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOOTER_COPY } from "@/content/landing";

const Footer = () => {
  return (
    <footer className="py-8 bg-footer-bg border-t border-ivero-purple/15">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Top: mobile stack, desktop row */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-6">
          {/* Branding */}
          <div className="flex flex-col gap-2 shrink-0">
            <span className="font-display text-5xl sm:text-7xl font-bold leading-none" style={{ background: "linear-gradient(90deg, hsl(265, 70%, 50%), hsl(300, 60%, 50%), hsl(330, 85%, 55%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {FOOTER_COPY.brand}
            </span>
            <p className="text-base sm:text-lg text-muted-foreground italic">{FOOTER_COPY.tagline}</p>
          </div>

          {/* Links — grid 2 cols no mobile, 5 cols no desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 text-sm w-full md:w-auto shrink-0">
            {FOOTER_COPY.columns.map((column) => (
              <div key={column.title} className="flex flex-col gap-1">
                <h4 className="font-semibold text-foreground mb-1">{column.title}</h4>
                {column.links.map((link) => (
                  <a
                    key={`${column.title}-${link.label}`}
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-ivero-purple/15 pt-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground text-center md:text-left">{FOOTER_COPY.copyright}</p>
          <div className="flex flex-col items-center md:items-end gap-2">
            <Button variant="hero" size="default" className="px-5 text-sm w-full sm:w-auto" asChild>
              <a href="#">
                {FOOTER_COPY.founderCta}
                <ArrowRight className="ml-1.5 w-4 h-4" />
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">{FOOTER_COPY.madeWith}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
