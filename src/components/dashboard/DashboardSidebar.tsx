import {
  LayoutDashboard, Radar, GitCompare, BarChart3, TrendingUp, Shield,
  FileText, Map, Bell, FlaskConical, Terminal, Megaphone,
  Download, Settings, LogOut, Crown, Users, Mail,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { InfoTooltip } from "@/components/InfoTooltip";
import { alertsData } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { useUserRole } from "@/hooks/useUserRole";
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

const unreadAlerts = alertsData.filter((a) => !a.read).length;

const menuGroups = [
  {
    label: "Visão Geral",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { title: "Monitoramento Multi-IA", url: "/dashboard/monitoramento", icon: Radar },
      { title: "Análise Comparativa", url: "/dashboard/comparativo", icon: GitCompare },
      { title: "Dominância por Modelo", url: "/dashboard/dominancia", icon: BarChart3 },
      { title: "Score GEO", url: "/dashboard/score", icon: TrendingUp },
      { title: "Análise de Sentimento", url: "/dashboard/sentimento", icon: Shield },
    ],
  },
  {
    label: "Ações",
    items: [
      { title: "Planos de Ação", url: "/dashboard/acoes", icon: FileText },
      { title: "Mapa de Prompts", url: "/dashboard/prompts", icon: Map },
      { title: "Alertas", url: "/dashboard/alertas", icon: Bell, badge: unreadAlerts },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { title: "Simulador de Influência", url: "/dashboard/simulador", icon: FlaskConical },
      { title: "Prompt Tester", url: "/dashboard/prompt-tester", icon: Terminal },
      { title: "Campanhas", url: "/dashboard/campanhas", icon: Megaphone },
    ],
  },
  {
    label: "Extras",
    items: [
      { title: "Relatórios", url: "/dashboard/relatorios", icon: Download },
      { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings },
    ],
  },
];

export function DashboardSidebar() {
  const navigate = useNavigate();
  const { data: settings } = useBrandSettings();
  const { isAdmin } = useUserRole();
  const displayName = settings?.brand_name || "Minha Marca";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar className="border-r border-border">
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
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                        {"badge" in item && item.badge ? (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                            {item.badge}
                          </span>
                        ) : null}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
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
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/dashboard/admin"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <Crown className="h-4 w-4 shrink-0" />
                      <span className="truncate">Painel Admin</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/dashboard/admin/clientes"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      <span className="truncate">Clientes</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/dashboard/admin/leads"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">Leads</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
            <p className="text-xs text-muted-foreground">Plano Pro</p>
          </div>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors" title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
