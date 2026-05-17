import {
  LayoutDashboard, Radar, GitCompare, BarChart3, TrendingUp, Shield,
  FileText, Map, Bell, FlaskConical, Megaphone, PenLine,
  Download, Settings, LogOut, Crown, Users, Mail, Send, FileSignature, Gauge, HelpCircle, Brain, CreditCard, Lock, Tags, History, MessageSquare, TestTube,
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
} from "@/components/ui/sidebar";

// unreadAlerts é injetado dinamicamente em runtime via usePerceptionAlerts

const menuGroups = [
  {
    label: "Visão Geral",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Diagnóstico IA", url: "/dashboard/diagnostico", icon: Brain },
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
      { title: "Simulador de Influência", url: "/dashboard/simulador", icon: FlaskConical },
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
  const displayName = settings?.brand_name || "Minha Marca";
  const planLabel = isAdmin ? "Admin" : isPaid ? "Plano Pago" : isTrial ? "Trial" : "Gratuito";

  // Trial users (não-admin, não pago) veem itens bloqueados com lock + opacity.
  const showLockState = !isPaid && !isAdmin;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Clear PostHog identity so the next user on this device isn't tracked as this one.
    resetIdentity();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold font-display text-gradient">Ivero</span>
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 mb-1">
              {group.label}
            </SidebarGroupLabel>
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
                  const linkContent = (
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className={`group/navlink relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg text-sm text-foreground/75 transition-colors duration-150 cursor-pointer hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                        locked ? "opacity-55 hover:opacity-100" : ""
                      }`}
                      activeClassName="bg-primary/15 text-primary font-semibold shadow-sm ring-1 ring-primary/25 hover:bg-primary/20 hover:text-primary"
                    >
                      {/* Indicador ativo: barra lateral com glow (visível só quando aria-current=page) */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary opacity-0 shadow-[0_0_12px_2px_hsl(var(--primary)/0.55)] transition-opacity [[aria-current=page]_&]:opacity-100"
                      />
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                      {locked ? (
                        <Lock className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
                      ) : badgeValue ? (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                          {badgeValue}
                        </span>
                      ) : null}
                    </NavLink>
                  );

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        {locked ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">
                              Disponível nos planos pagos
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
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 mb-1 flex items-center gap-1">
              Administração
              <InfoTooltip text="Área exclusiva para gestão do negócio Ivero: métricas financeiras, de produto, estratégicas, risco e gestão de clientes." />
            </SidebarGroupLabel>
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
                ].map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard/admin"}
                        className="group/navlink relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg text-sm text-foreground/75 transition-colors duration-150 cursor-pointer hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                        activeClassName="bg-primary/15 text-primary font-semibold shadow-sm ring-1 ring-primary/25 hover:bg-primary/20 hover:text-primary"
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary opacity-0 shadow-[0_0_12px_2px_hsl(var(--primary)/0.55)] transition-opacity [[aria-current=page]_&]:opacity-100"
                        />
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground">{planLabel}</p>
          </div>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors" title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
