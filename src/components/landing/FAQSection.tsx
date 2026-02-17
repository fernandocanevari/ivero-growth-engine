import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "O que é GEO (Generative Engine Optimization)?",
    answer:
      "GEO é a disciplina de otimizar a presença e visibilidade de uma marca nas respostas geradas por IAs como ChatGPT, Gemini e Perplexity. Diferente do SEO tradicional, que foca em buscadores, o GEO garante que sua marca seja recomendada quando usuários fazem perguntas diretamente a assistentes de IA.",
  },
  {
    question: "Como a Ivero monitora as respostas das IAs?",
    answer:
      "A Ivero realiza consultas estratégicas e contínuas às principais IAs generativas do mercado, analisando se sua marca aparece, como é mencionada, qual o sentimento associado e como se posiciona frente aos concorrentes. Tudo isso é transformado em dados acionáveis no seu painel.",
  },
  {
    question: "Quais IAs a Ivero monitora?",
    answer:
      "Atualmente monitoramos ChatGPT (OpenAI), Gemini (Google), Perplexity, Claude (Anthropic) e Microsoft Copilot. Estamos constantemente expandindo para cobrir novas IAs relevantes do mercado.",
  },
  {
    question: "O que é o GEO Visibility Score?",
    answer:
      "É uma pontuação exclusiva da Ivero que mede de 0 a 100 o quanto sua marca é visível e bem posicionada nas respostas de IAs generativas. Ele considera frequência de menções, sentimento, posição nas respostas e comparação com concorrentes.",
  },
  {
    question: "A Ivero substitui ferramentas de SEO?",
    answer:
      "Não. A Ivero complementa sua estratégia de SEO. Enquanto o SEO otimiza sua presença nos buscadores tradicionais, o GEO garante que você também esteja visível no novo canal de descoberta: as respostas de IAs generativas. Juntos, eles cobrem todo o ecossistema de busca.",
  },
  {
    question: "Quanto tempo leva para ver resultados?",
    answer:
      "Você terá acesso ao seu primeiro diagnóstico de visibilidade em até 24 horas após configurar sua conta. Os planos de ação estratégicos são gerados automaticamente, e melhorias na visibilidade podem ser observadas em semanas, dependendo da implementação das recomendações.",
  },
  {
    question: "Posso monitorar meus concorrentes?",
    answer:
      "Sim! A Ivero permite adicionar concorrentes ao seu painel para análise comparativa. Você verá lado a lado como sua marca e os concorrentes aparecem nas respostas de IA, identificando oportunidades e ameaças em tempo real.",
  },
  {
    question: "A Ivero é indicada para quais tipos de empresa?",
    answer:
      "A Ivero atende marcas de todos os portes, agências de marketing digital, e-commerces e equipes de SEO/conteúdo que desejam se antecipar à transformação na forma como consumidores descobrem produtos e serviços através de IAs.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-16 bg-secondary/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
            Perguntas Frequentes
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
