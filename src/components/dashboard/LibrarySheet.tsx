import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search, BookOpen } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LibraryEntry {
  name: string;
  url: string;
  what: string;
  purpose: string;
  when: string;
}

interface LibrarySection {
  label: string;
  entries: LibraryEntry[];
}

const SECTIONS: LibrarySection[] = [
  {
    label: "Visão Geral",
    entries: [
      {
        name: "Dashboard",
        url: "/dashboard",
        what: "Tela inicial com o resumo executivo da sua presença nas IAs.",
        purpose: "Tem uma leitura rápida de score, alertas e próximos passos sem entrar em cada módulo.",
        when: "No início do dia ou da semana, para checar como sua marca está sendo percebida pelas IAs.",
      },
      {
        name: "Diagnóstico IA",
        url: "/dashboard/diagnostico",
        what: "Auditoria completa de como sua marca aparece em múltiplas IAs.",
        purpose: "Mostra os pontos fortes, fracos e oportunidades por pilar estratégico.",
        when: "No primeiro acesso e sempre que quiser uma fotografia atualizada da sua influência.",
      },
      {
        name: "Relatórios",
        url: "/dashboard/auditorias",
        what: "Histórico de todas as auditorias e diagnósticos realizados.",
        purpose: "Compara evolução ao longo do tempo e recupera análises antigas.",
        when: "Quando quiser revisar o que mudou desde a última auditoria.",
      },
      {
        name: "Evolução Estratégica",
        url: "/dashboard/pilares",
        what: "Visão de longo prazo dos seus 5 pilares de marca.",
        purpose: "Mostra crescimento ou retração em cada dimensão estratégica.",
        when: "Em revisões mensais ou trimestrais de performance.",
      },
    ],
  },
  {
    label: "Inteligência",
    entries: [
      {
        name: "Monitoramento Multi-IA",
        url: "/dashboard/monitoramento",
        what: "Acompanha menções da sua marca em diferentes modelos de IA.",
        purpose: "Identifica em quais IAs sua marca já é citada e onde está ausente.",
        when: "Sempre que quiser saber onde sua marca está aparecendo.",
      },
      {
        name: "Análise Comparativa",
        url: "/dashboard/comparativo",
        what: "Compara sua marca lado a lado com concorrentes nas IAs.",
        purpose: "Mostra quem domina cada categoria e onde existem brechas para você crescer.",
        when: "Antes de planejar uma campanha ou movimento competitivo.",
      },
      {
        name: "Dominância por Modelo",
        url: "/dashboard/dominancia",
        what: "Detalha sua participação de menção em cada IA específica.",
        purpose: "Identifica se você está mais forte em uma IA do que em outra.",
        when: "Para definir prioridades de presença por canal de IA.",
      },
      {
        name: "Score GEO",
        url: "/dashboard/score",
        what: "Sua nota de Generative Engine Optimization de 0 a 100.",
        purpose: "Resume em um número o quanto sua marca é influente nas IAs.",
        when: "Para acompanhar evolução ao longo do tempo e definir metas.",
      },
      {
        name: "Tags de Percepção",
        url: "/dashboard/tags-percepcao",
        what: "Traduz scores em tags de percepção (verde, amarelo, vermelho).",
        purpose: "Comunica de forma simples como sua marca é vista pelas IAs.",
        when: "Para apresentar resultados a executivos de forma rápida e visual.",
      },
      {
        name: "Análise de Sentimento",
        url: "/dashboard/sentimento",
        what: "Mostra se sua marca é citada de forma positiva, neutra ou negativa.",
        purpose: "Detecta crises de reputação e narrativas favoráveis.",
        when: "Após lançamentos, crises ou campanhas relevantes.",
      },
      {
        name: "Simulador de Influência",
        url: "/dashboard/simulador",
        what: "Simula como uma mudança no seu conteúdo afetaria sua influência.",
        purpose: "Testa hipóteses estratégicas antes de executar mudanças reais.",
        when: "Antes de investir em uma nova frente de conteúdo.",
      },
    ],
  },
  {
    label: "Ações",
    entries: [
      {
        name: "Planos de Ação",
        url: "/dashboard/acoes",
        what: "Lista priorizada de ações concretas para melhorar sua presença em IAs.",
        purpose: "Transforma os diagnósticos em tarefas executáveis.",
        when: "Após cada Diagnóstico IA ou revisão estratégica.",
      },
      {
        name: "Gerador de Conteúdo",
        url: "/dashboard/conteudo",
        what: "Gera artigos, FAQs e resumos otimizados para IAs.",
        purpose: "Acelera a criação de conteúdo que tem maior chance de ser citado.",
        when: "Sempre que precisar produzir conteúdo focado em GEO.",
      },
      {
        name: "Mapa de Prompts",
        url: "/dashboard/prompts",
        what: "Mapa dos prompts em que sua marca pode ou deveria aparecer.",
        purpose: "Mostra oportunidades não exploradas para ganhar presença.",
        when: "No planejamento editorial e de SEO/GEO.",
      },
      {
        name: "Alertas",
        url: "/dashboard/alertas",
        what: "Notificações sobre mudanças relevantes na sua percepção.",
        purpose: "Avisa em tempo hábil quando algo importante muda.",
        when: "Sempre que houver indicador de alerta no menu lateral.",
      },
      {
        name: "Campanhas",
        url: "/dashboard/campanhas",
        what: "Espaço para planejar e medir campanhas focadas em GEO.",
        purpose: "Liga objetivos de marketing à evolução das suas métricas.",
        when: "Ao iniciar um novo projeto, lançamento ou push competitivo.",
      },
    ],
  },
  {
    label: "Extras",
    entries: [
      {
        name: "Exportar Dados",
        url: "/dashboard/relatorios",
        what: "Exporta diagnósticos e métricas em PDF, CSV e Excel.",
        purpose: "Compartilha dados com sua equipe, board ou clientes.",
        when: "Em apresentações executivas ou para arquivo histórico.",
      },
      {
        name: "Assinatura",
        url: "/dashboard/assinatura",
        what: "Plano atual, próxima cobrança, faturas e forma de pagamento.",
        purpose: "Gerencia tudo que envolve o lado financeiro da plataforma.",
        when: "Para mudar de plano, atualizar dados de pagamento ou ver faturas.",
      },
      {
        name: "Configurações",
        url: "/dashboard/configuracoes",
        what: "Ajustes da marca, concorrentes, setor e dados de contato.",
        purpose: "Mantém os dados que alimentam todas as análises atualizados.",
        when: "Ao adicionar novos concorrentes ou atualizar informações da marca.",
      },
      {
        name: "Central de Ajuda",
        url: "/dashboard/ajuda",
        what: "Suporte direto, FAQ e contato com o time Ivero.",
        purpose: "Resolve dúvidas operacionais e abre canal de atendimento.",
        when: "Quando precisar de ajuda humana ou tirar uma dúvida pontual.",
      },
    ],
  },
];

export function LibrarySheet() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((sec) => ({
      ...sec,
      entries: sec.entries.filter((e) => e.name.toLowerCase().includes(q)),
    })).filter((sec) => sec.entries.length > 0);
  }, [query]);

  const handleGo = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          aria-label="Abrir Biblioteca Ivero"
        >
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Biblioteca</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg overflow-y-auto p-0"
      >
        <div className="sticky top-0 z-10 bg-background border-b border-border p-5">
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="font-display flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Biblioteca Ivero
            </SheetTitle>
            <SheetDescription>
              Entenda no seu ritmo o que cada página faz e quando usar.
            </SheetDescription>
          </SheetHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar página..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="p-5 space-y-6">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma página encontrada para "{query}".
            </p>
          )}

          {filtered.map((section) => (
            <section key={section.label}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-3">
                {section.label}
              </h3>
              <div className="space-y-3">
                {section.entries.map((entry) => (
                  <article
                    key={entry.url}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <h4 className="text-sm font-semibold text-foreground mb-2">{entry.name}</h4>
                    <dl className="space-y-1.5 text-xs">
                      <div>
                        <dt className="font-medium text-muted-foreground inline">O que é: </dt>
                        <dd className="inline text-foreground/80">{entry.what}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground inline">Para que serve: </dt>
                        <dd className="inline text-foreground/80">{entry.purpose}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground inline">Quando usar: </dt>
                        <dd className="inline text-foreground/80">{entry.when}</dd>
                      </div>
                    </dl>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 -ml-2 text-primary hover:text-primary"
                      onClick={() => handleGo(entry.url)}
                    >
                      Ir para {entry.name} <ArrowRight className="h-3 w-3" />
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
