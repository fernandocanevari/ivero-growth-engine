import { motion } from "framer-motion";
import { HelpCircle, Bot, Eye, BarChart3, Layers, Clock, Users, Building2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    icon: HelpCircle,
    question: "O que é GEO (Generative Engine Optimization)?",
    answer:
      "GEO é a disciplina de otimizar a presença e visibilidade de uma marca nas respostas geradas por IAs como ChatGPT, Gemini e Perplexity. Diferente do SEO tradicional, que foca em buscadores, o GEO garante que sua marca seja recomendada quando usuários fazem perguntas diretamente a assistentes de IA.",
  },
  {
    icon: Bot,
    question: "Como a Ivero monitora as respostas das IAs?",
    answer:
      "A Ivero realiza consultas estratégicas e contínuas às principais IAs generativas do mercado, analisando se sua marca aparece, como é mencionada, qual o sentimento associado e como se posiciona frente aos concorrentes. Tudo isso é transformado em dados acionáveis no seu painel.",
  },
  {
    icon: Eye,
    question: "Quais IAs a Ivero monitora?",
    answer:
      "Atualmente monitoramos ChatGPT (OpenAI), Gemini (Google), Perplexity, Claude (Anthropic) e Microsoft Copilot. Estamos constantemente expandindo para cobrir novas IAs relevantes do mercado.",
  },
  {
    icon: BarChart3,
    question: "O que é o GEO Visibility Score?",
    answer:
      "É uma pontuação exclusiva da Ivero que mede de 0 a 100 o quanto sua marca é visível e bem posicionada nas respostas de IAs generativas. Ele considera frequência de menções, sentimento, posição nas respostas e comparação com concorrentes.",
  },
  {
    icon: Layers,
    question: "A Ivero substitui ferramentas de SEO?",
    answer:
      "Não. A Ivero complementa sua estratégia de SEO. Enquanto o SEO otimiza sua presença nos buscadores tradicionais, o GEO garante que você também esteja visível no novo canal de descoberta: as respostas de IAs generativas. Juntos, eles cobrem todo o ecossistema de busca.",
  },
  {
    icon: Clock,
    question: "Quanto tempo leva para ver resultados?",
    answer:
      "Você terá acesso ao seu primeiro diagnóstico de visibilidade em até 24 horas após configurar sua conta. Os planos de ação estratégicos são gerados automaticamente, e melhorias na visibilidade podem ser observadas em semanas, dependendo da implementação das recomendações.",
  },
  {
    icon: Users,
    question: "Posso monitorar meus concorrentes?",
    answer:
      "Sim! A Ivero permite adicionar concorrentes ao seu painel para análise comparativa. Você verá lado a lado como sua marca e os concorrentes aparecem nas respostas de IA, identificando oportunidades e ameaças em tempo real.",
  },
  {
    icon: Building2,
    question: "A Ivero é indicada para quais tipos de empresa?",
    answer:
      "A Ivero atende marcas de todos os portes, agências de marketing digital, e-commerces e equipes de SEO/conteúdo que desejam se antecipar à transformação na forma como consumidores descobrem produtos e serviços através de IAs.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-14 sm:py-16 bg-background relative overflow-hidden">
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
