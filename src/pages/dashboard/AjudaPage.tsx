import { MessageCircle, Mail, Clock, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import {
  WHATSAPP_DISPLAY,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  getWhatsappUrl,
  getMailtoUrl,
} from "@/lib/support";
import { track } from "@/lib/analytics";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Como interpretar o Score de Influência?",
    a: "O Score (0–100) mede a presença e a qualidade com que sua marca aparece nas IAs (ChatGPT, Gemini, Google Modo IA com grounding do Google em tempo real e Claude). É composto por 5 pilares — Clareza, Autoridade, Conversão, Posicionamento e Experiência — cada um com 3 sub-critérios ponderados. Faixas: 0–39 Crítico, 40–59 Insuficiente, 60–74 Moderado, 75–89 Sólido, 90–100 Referência.",
  },
  {
    q: "Com que frequência posso rodar uma nova análise?",
    a: "A re-análise tem cooldown de 30 dias. Esse intervalo é o mínimo recomendado para que mudanças no seu site, conteúdo e percepção sejam efetivamente capturadas pelas IAs e gerem deltas confiáveis no dashboard.",
  },
  {
    q: "O que são as Tags de Percepção?",
    a: "São evidências semânticas extraídas das respostas das IAs sobre sua marca, classificadas em verde (positivo), amarelo (neutro/ambíguo) e vermelho (atenção). Servem como tradução qualitativa do Score: o número diz onde você está; as tags dizem por quê.",
  },
  {
    q: "Como funciona o Gerador de Conteúdo Estratégico?",
    a: "O Gerador (em /dashboard/conteudo) cria Artigo + FAQ + Resumo otimizados para citação por IAs, usando o contexto do seu diagnóstico mais recente. No trial você tem 2 gerações; nos planos pagos é ilimitado. Exporte em Markdown ou DOCX.",
  },
  {
    q: "O que está disponível no trial?",
    a: "Trial libera: Dashboard, Diagnóstico IA, Score GEO, Configurações, Assinatura e Gerador de Conteúdo (com cota de 2 gerações). Demais recursos premium ficam visíveis com cadeado e abrem após o upgrade.",
  },
  {
    q: "Como faço upgrade ou cancelamento de plano?",
    a: "Acesse Configurações → Assinatura. Lá você visualiza o plano ativo, faz upgrade entre Presença / Influência / Autoridade / Domínio, ou solicita cancelamento. Para mudanças com efeito imediato fora do fluxo padrão, fale com o time pelo WhatsApp.",
  },
  {
    q: "Como troco a marca monitorada ou os concorrentes?",
    a: "Em Configurações você edita o nome da marca, site, setor, concorrente principal e concorrentes secundários. Após salvar, a próxima análise usará automaticamente os novos dados.",
  },
  {
    q: "Qual é o prazo de resposta do suporte?",
    a: `Atendemos em ${SUPPORT_HOURS}. Mensagens via WhatsApp são respondidas em algumas horas; emails em até 1 dia útil. Em casos críticos (falha de acesso, cobrança), priorize o WhatsApp.`,
  },
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function AjudaPage() {
  const { data: settings } = useBrandSettings();
  const brandName = settings?.brand_name;
  const [query, setQuery] = useState("");

  const filteredFaq = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return FAQ;
    return FAQ.filter(
      (item) => normalize(item.q).includes(q) || normalize(item.a).includes(q),
    );
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold font-display text-foreground mb-2">
          Como podemos ajudar?
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Encontre respostas rápidas no FAQ abaixo ou fale diretamente com o time da Ivero pelos canais oficiais.
        </p>
      </motion.div>

      {/* Canais diretos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <a
          href={getWhatsappUrl(brandName)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("support_channel_clicked", { channel: "whatsapp", source: "help_page" })}
          className="group rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-all hover:border-emerald-300"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-0.5">Resposta em algumas horas</p>
              <p className="text-sm font-medium text-foreground mt-2">{WHATSAPP_DISPLAY}</p>
            </div>
          </div>
        </a>

        <a
          href={getMailtoUrl(brandName)}
          onClick={() => track("support_channel_clicked", { channel: "email", source: "help_page" })}
          className="group rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-all hover:border-primary/40"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Mail className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Email</p>
              <p className="text-xs text-muted-foreground mt-0.5">Resposta em até 1 dia útil</p>
              <p className="text-sm font-medium text-foreground mt-2 truncate">{SUPPORT_EMAIL}</p>
            </div>
          </div>
        </a>
      </div>

      {/* FAQ */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-foreground">Perguntas frequentes</h2>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar dúvida..."
              aria-label="Buscar nas perguntas frequentes"
              className="pl-9 pr-9 h-10"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-2 sm:p-4">
          {filteredFaq.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma dúvida encontrada para <span className="font-medium text-foreground">"{query}"</span>.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Não achou o que procurava? Fale com o time pelo WhatsApp ou email acima.
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredFaq.map((item, i) => (
                <AccordionItem key={item.q} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>

      {/* Horário */}
      <div className="rounded-2xl border border-border bg-secondary/30 p-5 flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-background text-muted-foreground flex items-center justify-center shrink-0">
          <Clock className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Horário de atendimento</p>
          <p className="text-xs text-muted-foreground mt-1">{SUPPORT_HOURS}</p>
        </div>
        <Button asChild variant="default" size="sm" className="shrink-0">
          <a
            href={getWhatsappUrl(brandName)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("support_channel_clicked", { channel: "whatsapp", source: "help_page_footer" })}
          >
            Falar agora
          </a>
        </Button>
      </div>
    </div>
  );
}
