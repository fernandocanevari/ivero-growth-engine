import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FAQItem } from "@/content/blog/types";

interface Props {
  items: FAQItem[];
}

/**
 * FAQ block — purely presentational. The corresponding FAQPage JSON-LD
 * is injected by the page wrapper via lib/seo.ts so structured data
 * remains co-located with all the other meta tags.
 */
export function BlogFAQ({ items }: Props) {
  if (!items.length) return null;
  return (
    <section className="mt-16 pt-12 border-t border-border">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        Perguntas frequentes
      </p>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-6">
        Dúvidas comuns sobre este tema
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, idx) => (
          <AccordionItem key={idx} value={`faq-${idx}`}>
            <AccordionTrigger className="text-left font-display font-semibold text-foreground hover:no-underline">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-foreground/80 leading-relaxed text-[0.95rem]">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
