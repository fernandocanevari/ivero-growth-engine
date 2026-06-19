import { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Radar, GitCompare, BarChart3, TrendingUp, Shield,
  FileText, Map, Bell, FlaskConical, Megaphone, PenLine,
  Download, Settings, Crown, Users, Mail, Send, FileSignature, Gauge,
  HelpCircle, Brain, CreditCard, Tags, History, MessageSquare, TestTube,
  type LucideIcon,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

type Item = { title: string; url: string; icon: LucideIcon };
type Group = { label: string; items: Item[] };

// Espelha a estrutura/ícones de DashboardSidebar.tsx para manter o
// breadcrumb sincronizado com o item ativo do menu.
const menuGroups: Group[] = [
  {
    label: "Visão Geral",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Diagnóstico IA", url: "/dashboard/diagnostico", icon: Brain },
      { title: "Análise de Resultados", url: "/dashboard/auditorias", icon: History },
      { title: "Evolução Estratégica", url: "/dashboard/pilares", icon: TrendingUp },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { title: "Monitoramento Multi-IA", url: "/dashboard/monitoramento", icon: Radar },
      { title: "Análise Comparativa", url: "/dashboard/comparativo", icon: GitCompare },
      { title: "Dominância por Modelo", url: "/dashboard/dominancia", icon: BarChart3 },
      { title: "Score GEO", url: "/dashboard/score", icon: Gauge },
      { title: "Tags de Percepção", url: "/dashboard/tags-percepcao", icon: Tags },
      { title: "Análise de Sentimento", url: "/dashboard/sentimento", icon: Shield },
      { title: "Simulador de Influência", url: "/dashboard/simulador", icon: FlaskConical },
    ],
  },
  {
    label: "Ações",
    items: [
      { title: "Planos de Ação", url: "/dashboard/acoes", icon: FileText },
      { title: "Gerador de Conteúdo", url: "/dashboard/conteudo", icon: PenLine },
      { title: "Mapa de Prompts", url: "/dashboard/prompts", icon: Map },
      { title: "Alertas", url: "/dashboard/alertas", icon: Bell },
      { title: "Campanhas", url: "/dashboard/campanhas", icon: Megaphone },
    ],
  },
  {
    label: "Extras",
    items: [
      { title: "Exportar Dados", url: "/dashboard/relatorios", icon: Download },
      { title: "Assinatura", url: "/dashboard/assinatura", icon: CreditCard },
      { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings },
      { title: "Central de Ajuda", url: "/dashboard/ajuda", icon: HelpCircle },
    ],
  },
  {
    label: "Administração",
    items: [
      { title: "Painel Admin", url: "/dashboard/admin", icon: Crown },
      { title: "Clientes", url: "/dashboard/admin/clientes", icon: Users },
      { title: "Leads", url: "/dashboard/admin/leads", icon: Mail },
      { title: "Propostas", url: "/dashboard/admin/propostas", icon: FileSignature },
      { title: "Convites", url: "/dashboard/admin/convites", icon: Send },
      { title: "Respostas", url: "/dashboard/admin/respostas", icon: MessageSquare },
      { title: "Prompt Tester", url: "/dashboard/prompt-tester", icon: TestTube },
    ],
  },
];

export function DashboardBreadcrumb({ className }: { className?: string }) {
  const location = useLocation();

  const breadcrumb = useMemo(() => {
    const path = location.pathname;
    const normalizedPath =
      path.endsWith("/") && path !== "/dashboard" ? path.slice(0, -1) : path;

    // Busca o match MAIS específico:
    //  - rota exata sempre vence prefixo
    //  - entre prefixos, o de URL mais longa vence (rota aninhada com :id, etc.)
    //  - "/dashboard" (raiz) só conta como match exato, nunca como prefixo,
    //    para que sub-rotas desconhecidas (ex.: /dashboard/foo) não exibam
    //    incorretamente o item "Dashboard" como se fosse o atual.
    let best: { group: string; item: Item; score: number } | null = null;
    for (const group of menuGroups) {
      for (const item of group.items) {
        const isRootItem = item.url === "/dashboard";
        if (normalizedPath === item.url) {
          const score = item.url.length + 10_000; // exato sempre vence
          if (!best || score > best.score) {
            best = { group: group.label, item, score };
          }
        } else if (!isRootItem && normalizedPath.startsWith(item.url + "/")) {
          const score = item.url.length;
          if (!best || score > best.score) {
            best = { group: group.label, item, score };
          }
        }
      }
    }

    if (!best) return null;
    return {
      group: best.group,
      page: best.item.title,
      Icon: best.item.icon,
      isRoot: best.item.url === "/dashboard",
    };
  }, [location.pathname]);

  if (!breadcrumb) return null;

  const { Icon } = breadcrumb;

  return (
    <Breadcrumb
      className={cn("hidden sm:block", className)}
      aria-label="Localização atual no painel"
      data-testid="dashboard-breadcrumb"
    >
      <BreadcrumbList className="items-center gap-1.5">
        {/* Indicador glow espelhando o item ativo da sidebar */}
        <span
          aria-hidden
          className="inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_2px_hsl(var(--primary)/0.55)] mr-1"
        />

        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              to="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {breadcrumb.group}
          </span>
        </BreadcrumbItem>

        {!breadcrumb.isRoot && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage
                className="flex items-center gap-1.5 font-semibold text-primary"
                data-testid="breadcrumb-current"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {breadcrumb.page}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
