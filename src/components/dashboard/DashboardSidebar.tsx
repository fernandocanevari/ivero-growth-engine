import {
  LayoutDashboard, Radar, GitCompare, BarChart3, TrendingUp, Shield,
  FileText, Map, Bell, FlaskConical, Megaphone, PenLine,
  Download, Settings, LogOut, Crown, Users, Mail, Send, FileSignature, Gauge, HelpCircle, Brain, CreditCard, Lock, Tags, History, MessageSquare, TestTube, PanelLeft,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { InfoTooltip } from "@/components/InfoTooltip";
import { usePerceptionAlerts } from "@/hooks/usePerceptionAlerts";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { isRouteAllowedInTrial } from "@/lib/access-control";
import { resetIdentity } from "@/lib/analytics";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const LABEL_TRUNCATE = 18;

const menuGroups = [
  {
    label: "Visão Geral",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Diagnóstico IA", url: "/dashboard/diagnostico", icon: Brain, beta: true },
      { title: "Relatórios", url: "/dashboard/auditorias", icon: History },
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
      { title: "Simulador de Influência", url: "/dashboard/simulador", icon: FlaskConical, beta: true },
    ],
  },
  {
    label: "Ações",
    items: [
      { title: "Planos de Ação", url: "/dashboard/acoes", icon: FileText },
      { title: "Gerador de Conteúdo", url: "/dashboard/conteudo", icon: PenLine },
      { title: "Mapa de Prompts", url: "/dashboard/prompts", icon: Map },
      { title: "Alertas", url: "/dashboard/alertas", icon: Bell, dynamicBadge: "perception" as const },
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
];

export function DashboardSidebar() {
  const navigate = useNavigate();
  const { data: settings } = useBrandSettings();
  const { isAdmin } = useUserRole();
  const { isPaid, isTrial } = useSubscriptionStatus();
  const { unreadCount: perceptionUnread } = usePerceptionAlerts();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const displayName = settings?.brand_name || "Minha Marca";
  const planLabel = isAdmin ? "Admin" : isPaid ? "Plano Pago" : isTrial ? "Trial" : "Gratuito";

  const showLockState = !isPaid && !isAdmin;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    resetIdentity();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarHeader className="p-3 border-b border-border">
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
          {!collapsed && (
            <NavLink to="/dashboard" className="flex items-center gap-2 px-1">
              <span className="text-xl font-bold font-display text-gradient">Ivero</span>
            </NavLink>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors duration-150"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {menuGroups.map((group, groupIdx) => (
          <SidebarGroup
            key={group.label}
            className={groupIdx > 0 ? "mt-2 pt-3 border-t border-border/60" : ""}
          >
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70 px-3 mb-1">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const locked = showLockState && !isRouteAllowedInTrial(item.url);
                  const dynamicBadgeValue =
                    "dynamicBadge" in item && item.dynamicBadge === "perception"
                      ? perceptionUnread
                      : 0;
                  const staticBadge = "badge" in item ? (item as { badge?: number }).badge : 0;
                  const badgeValue = dynamicBadgeValue || staticBadge || 0;
                  const isBeta = "beta" in item && (item as { beta?: boolean }).beta;
                  const isAlerts = item.url === "/dashboard/alertas";
                  const isLong = item.title.length > LABEL_TRUNCATE;
                  const needsTooltip = collapsed || isLong || locked;
                  const tooltipText = locked
                    ? `${item.title} — disponível nos planos pagos`
                    : item.title;

                  const linkContent = (
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className={`group/navlink relative flex items-center gap-3 h-10 rounded-lg text-sm text-foreground/75 transition-all duration-150 ease-out cursor-pointer hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                        collapsed ? "justify-center px-0 w-10 mx-auto" : "px-3"
                      } ${locked ? "opacity-55 hover:opacity-100" : ""}`}
                      activeClassName="!bg-primary !text-primary-foreground font-semibold shadow-sm hover:!bg-primary/95 hover:!text-primary-foreground"
                    >
                      <item.icon className={`shrink-0 ${collapsed ? "h-6 w-6" : "h-4 w-4"}`} />
                      {!collapsed && (
                        <>
                          <span className="truncate flex-1 min-w-0">{item.title}</span>
                          {locked ? (
                            <Lock className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
                          ) : (
                            <span className="ml-auto flex items-center gap-1.5">
                              {isBeta && (
                                <span className="rounded-full bg-accent/15 text-accent border border-accent/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider [[aria-current=page]_&]:bg-primary-foreground/20 [[aria-current=page]_&]:text-primary-foreground [[aria-current=page]_&]:border-primary-foreground/30">
                                  Beta
                                </span>
                              )}
                              {badgeValue ? (
                                <span
                                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                                    isAlerts
                                      ? "bg-destructive text-destructive-foreground"
                                      : "bg-accent text-accent-foreground"
                                  } [[aria-current=page]_&]:bg-primary-foreground [[aria-current=page]_&]:text-primary`}
                                >
                                  {badgeValue}
                                </span>
                              ) : null}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && badgeValue ? (
                        <span
                          className={`absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                            isAlerts
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-accent text-accent-foreground"
                          }`}
                        >
                          {badgeValue}
                        </span>
                      ) : null}
                    </NavLink>
                  );

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        {needsTooltip ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">
                              {tooltipText}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          linkContent
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {isAdmin && (
          <SidebarGroup className="mt-2 pt-3 border-t border-border/60">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70 px-3 mb-1 flex items-center gap-1">
                Administração
                <InfoTooltip text="Área exclusiva para gestão do negócio Ivero: métricas financeiras, de produto, estratégicas, risco e gestão de clientes." />
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { title: "Painel Admin", url: "/dashboard/admin", icon: Crown },
                  { title: "Clientes", url: "/dashboard/admin/clientes", icon: Users },
                  { title: "Leads", url: "/dashboard/admin/leads", icon: Mail },
                  { title: "Propostas", url: "/dashboard/admin/propostas", icon: FileSignature },
                  { title: "Convites", url: "/dashboard/admin/convites", icon: Send },
                  { title: "Respostas", url: "/dashboard/admin/respostas", icon: MessageSquare },
                  { title: "Prompt Tester", url: "/dashboard/prompt-tester", icon: TestTube },
                ].map((item) => {
                  const isLong = item.title.length > LABEL_TRUNCATE;
                  const needsTooltip = collapsed || isLong;
                  const linkContent = (
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard/admin"}
                      className={`group/navlink relative flex items-center gap-3 h-10 rounded-lg text-sm text-foreground/75 transition-all duration-150 ease-out cursor-pointer hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                        collapsed ? "justify-center px-0 w-10 mx-auto" : "px-3"
                      }`}
                      activeClassName="bg-primary/15 text-primary font-semibold shadow-sm ring-1 ring-primary/25 hover:bg-primary/20 hover:text-primary"
                    >
                      <item.icon className={`shrink-0 ${collapsed ? "h-6 w-6" : "h-4 w-4"}`} />
                      {!collapsed && <span className="truncate flex-1 min-w-0">{item.title}</span>}
                    </NavLink>
                  );
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild>
                        {needsTooltip ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">
                              {item.title}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          linkContent
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border">
        <div className={`flex items-center gap-3 ${collapsed ? "flex-col" : ""}`}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary cursor-default">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {displayName} · {planLabel}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate leading-tight">{displayName}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{planLabel}</p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground transition-colors duration-150 h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-primary/10"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Sair</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
