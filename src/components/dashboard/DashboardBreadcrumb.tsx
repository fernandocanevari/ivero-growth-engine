import { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

const menuGroups = [
  {
    label: "Visão Geral",
    items: [
      { title: "Dashboard", url: "/dashboard" },
      { title: "Diagnóstico IA", url: "/dashboard/diagnostico" },
      { title: "Relatórios", url: "/dashboard/auditorias" },
      { title: "Evolução Estratégica", url: "/dashboard/pilares" },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { title: "Monitoramento Multi-IA", url: "/dashboard/monitoramento" },
      { title: "Análise Comparativa", url: "/dashboard/comparativo" },
      { title: "Dominância por Modelo", url: "/dashboard/dominancia" },
      { title: "Score GEO", url: "/dashboard/score" },
      { title: "Tags de Percepção", url: "/dashboard/tags-percepcao" },
      { title: "Análise de Sentimento", url: "/dashboard/sentimento" },
      { title: "Simulador de Influência", url: "/dashboard/simulador" },
    ],
  },
  {
    label: "Ações",
    items: [
      { title: "Planos de Ação", url: "/dashboard/acoes" },
      { title: "Gerador de Conteúdo", url: "/dashboard/conteudo" },
      { title: "Mapa de Prompts", url: "/dashboard/prompts" },
      { title: "Alertas", url: "/dashboard/alertas" },
      { title: "Campanhas", url: "/dashboard/campanhas" },
    ],
  },
  {
    label: "Extras",
    items: [
      { title: "Exportar Dados", url: "/dashboard/relatorios" },
      { title: "Assinatura", url: "/dashboard/assinatura" },
      { title: "Configurações", url: "/dashboard/configuracoes" },
      { title: "Central de Ajuda", url: "/dashboard/ajuda" },
    ],
  },
  {
    label: "Administração",
    items: [
      { title: "Painel Admin", url: "/dashboard/admin" },
      { title: "Clientes", url: "/dashboard/admin/clientes" },
      { title: "Leads", url: "/dashboard/admin/leads" },
      { title: "Propostas", url: "/dashboard/admin/propostas" },
      { title: "Convites", url: "/dashboard/admin/convites" },
      { title: "Respostas", url: "/dashboard/admin/respostas" },
      { title: "Prompt Tester", url: "/dashboard/prompt-tester" },
    ],
  },
];

export function DashboardBreadcrumb({ className }: { className?: string }) {
  const location = useLocation();

  const breadcrumb = useMemo(() => {
    const path = location.pathname;

    // Remove trailing slash for matching (except root /dashboard)
    const normalizedPath = path.endsWith("/") && path !== "/dashboard" ? path.slice(0, -1) : path;

    for (const group of menuGroups) {
      for (const item of group.items) {
        // Exact match or startsWith for nested routes (e.g. /dashboard/auditorias/:id)
        if (normalizedPath === item.url || normalizedPath.startsWith(item.url + "/")) {
          return { group: group.label, page: item.title, isRoot: item.url === "/dashboard" };
        }
      }
    }

    return null;
  }, [location.pathname]);

  if (!breadcrumb) return null;

  return (
    <Breadcrumb className={cn("hidden sm:block", className)}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            {breadcrumb.group}
          </span>
        </BreadcrumbItem>

        {!breadcrumb.isRoot && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-foreground">
                {breadcrumb.page}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
