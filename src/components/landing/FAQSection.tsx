import { motion } from "framer-motion";
import { HelpCircle, Bot, Eye, BarChart3, Layers, Clock, Users, Building2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ } from "@/content/landing";

const FAQ_ICONS: Record<string, typeof HelpCircle> = {
  geo: HelpCircle,
  "como-monitora": Bot,
  "quais-ias": Eye,
  score: BarChart3,
  "substitui-seo": Layers,
  "tempo-resultados": Clock,
  concorrentes: Users,
  "tipos-empresa": Building2,
};

const faqs = FAQ.items.map((item) => ({ ...item, icon: FAQ_ICONS[item.key] }));

const FAQSection = () => {
  return (
    <section id="faq" className="pt-8 sm:pt-12 pb-14 sm:pb-16 bg-background relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-ivero-purple/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Perguntas{" "}
            <span className="text-gradient">Frequentes</span>
          </h2>
        </motion.div>

        {/* Mobile: lista única. Desktop: 2 colunas */}
        <div className="block md:hidden max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-4 sm:px-6 data-[state=open]:border-accent/30 data-[state=open]:shadow-[0_4px_20px_hsl(330_85%_55%/0.08)] transition-all duration-300"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-4 gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-ivero-gradient flex items-center justify-center shrink-0">
                      <faq.icon className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                    <span>{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-4 pl-10 text-sm">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="hidden md:grid grid-cols-2 gap-4 max-w-6xl mx-auto">
          {[faqs.slice(0, 4), faqs.slice(4, 8)].map((column, colIndex) => (
            <motion.div
              key={colIndex}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 + colIndex * 0.1 }}
            >
              <Accordion type="single" collapsible className="space-y-3">
                {column.map((faq, index) => {
                  const globalIndex = colIndex * 4 + index;
                  return (
                    <AccordionItem
                      key={globalIndex}
                      value={`item-${globalIndex}`}
                      className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-accent/30 data-[state=open]:shadow-[0_4px_20px_hsl(330_85%_55%/0.08)] transition-all duration-300"
                    >
                      <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-ivero-gradient flex items-center justify-center shrink-0">
                            <faq.icon className="w-4 h-4 text-primary-foreground" />
                          </div>
                          <span>{faq.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed pb-5 pl-11">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
