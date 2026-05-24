import { useEffect, useState } from "react";
import {
  LayoutDashboard, Radar, GitCompare, BarChart3, TrendingUp, Shield,
  FileText, Map, Bell, FlaskConical, Megaphone, PenLine,
  Download, Settings, LogOut, Crown, Users, Mail, Send, FileSignature, Gauge, HelpCircle, Brain, CreditCard, Lock, Tags, History, MessageSquare, TestTube, PanelLeft, ChevronRight, Info, ShieldCheck, FileCode,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { InfoTooltip } from "@/components/InfoTooltip";
import { usePerceptionAlerts } from "@/hooks/usePerceptionAlerts";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
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
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const LABEL_TRUNCATE = 18;

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  beta?: boolean;
  dynamicBadge?: "perception";
  badge?: number;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
  info?: string;
};

const menuGroups: MenuGroup[] = [
  {
    label: "Visão Geral",
    items: [
      { title: "Painel", url: "/dashboard", icon: LayoutDashboard },
      { title: "Diagnóstico IA", url: "/dashboard/diagnostico", icon: Brain, beta: true },
      { title: "Relatórios", url: "/dashboard/auditorias", icon: FileText },
      { title: "Evolução Estratégica", url: "/dashboard/pilares", icon: TrendingUp },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { title: "Monitoramento Multi-IA", url: "/dashboard/monitoramento", icon: Radar },
      { title: "Análise Comparativa", url: "/dashboard/comparativo", icon: GitCompare },
      { title: "Dominância por Modelo", url: "/dashboard/dominancia", icon: BarChart3 },
      { title: "Pontuação GEO", url: "/dashboard/score", icon: Gauge },
      { title: "Tags de Percepção", url: "/dashboard/tags-percepcao", icon: Tags },
      { title: "Análise de Sentimento", url: "/dashboard/sentimento", icon: Shield },
      { title: "Simulador de Influência", url: "/dashboard/simulador", icon: FlaskConical, beta: true },
      { title: "LLMs.txt", url: "/dashboard/llms-txt", icon: FileCode },
    ],
  },
  {
    label: "Ações",
    items: [
      { title: "Planos de Ação", url: "/dashboard/acoes", icon: FileText },
      { title: "Gerador de Conteúdo", url: "/dashboard/conteudo", icon: PenLine },
      { title: "Mapa de Prompts", url: "/dashboard/prompts", icon: Map },
      { title: "Alertas", url: "/dashboard/alertas", icon: Bell, dynamicBadge: "perception" },
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

const adminGroup: MenuGroup = {
  label: "Administração",
  info: "Área exclusiva para gestão do negócio Ivero: métricas financeiras, de produto, estratégicas, risco e gestão de clientes.",
  items: [
    { title: "Painel Admin", url: "/dashboard/admin", icon: Crown },
    { title: "Clientes", url: "/dashboard/admin/clientes", icon: Users },
    { title: "Pistas", url: "/dashboard/admin/leads", icon: Mail },
    { title: "Propostas", url: "/dashboard/admin/propostas", icon: FileSignature },
    { title: "Convites", url: "/dashboard/admin/convites", icon: Send },
    { title: "Respostas", url: "/dashboard/admin/respostas", icon: MessageSquare },
    { title: "Prompt Tester", url: "/dashboard/prompt-tester", icon: TestTube },
  ],
};

export function DashboardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: settings } = useBrandSettings();
  const { isAdmin } = useUserRole();
  const { isPaid, isTrial } = useSubscriptionStatus();
  const { unreadCount: perceptionUnread } = usePerceptionAlerts();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const displayName = settings?.brand_name || "Administrador";
  const planLabel = isAdmin ? "Admin" : isPaid ? "Plano Pago" : isTrial ? "Trial" : "Gratuito";
  const showLockState = !isPaid && !isAdmin;

  const allGroups = isAdmin ? [...menuGroups, adminGroup] : menuGroups;

  const STORAGE_KEY = "ivero_sidebar_sections";

  // Default open + persist in localStorage
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const defaults = Object.fromEntries(allGroups.map((g) => [g.label, true]));
    if (typeof window === "undefined") return defaults;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return { ...defaults, ...stored };
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections));
    } catch {
      /* noop */
    }
  }, [openSections]);

  // Auto-expand the section that contains the current route
  useEffect(() => {
    const path = location.pathname;
    const parent = allGroups.find((g) =>
      g.items.some((it) =>
        it.url === "/dashboard" || it.url === "/dashboard/admin"
          ? path === it.url
          : path === it.url || path.startsWith(it.url + "/"),
      ),
    );
    if (parent && !openSections[parent.label]) {
      setOpenSections((prev) => ({ ...prev, [parent.label]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleSection = (label: string) =>
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    resetIdentity();
    navigate("/login", { replace: true });
  };

  const renderItem = (item: MenuItem, isAdminGroup = false) => {
    const locked = !isAdminGroup && showLockState && !isRouteAllowedInTrial(item.url);
    const dynamicBadgeValue =
      item.dynamicBadge === "perception" ? perceptionUnread : 0;
    const badgeValue = dynamicBadgeValue || item.badge || 0;
    const isBeta = item.beta;
    const isAlerts = item.url === "/dashboard/alertas";
    const isLong = item.title.length > LABEL_TRUNCATE;
    const needsTooltip = collapsed || isLong || locked;
    const tooltipText = locked
      ? `${item.title} — disponível nos planos pagos`
      : item.title;

    const linkContent = (
      <NavLink
        to={item.url}
        end={item.url === "/dashboard" || item.url === "/dashboard/admin"}
        className={`group/navlink relative flex items-center gap-2.5 h-9 rounded-md text-[13px] text-foreground/80 transition-all duration-150 ease-out cursor-pointer hover:bg-primary/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          collapsed ? "justify-center px-0 w-10 mx-auto" : "pl-3 pr-2"
        } ${locked ? "text-foreground/60" : ""}`}
        activeClassName="!bg-primary/10 !text-primary font-medium hover:!bg-primary/15 [&_svg]:!text-primary before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full before:bg-primary"
      >
        <item.icon className={`shrink-0 ${collapsed ? "h-5 w-5" : "h-4 w-4"} text-foreground/70`} strokeWidth={1.75} />
        {!collapsed && (
          <>
            <span className="truncate flex-1 min-w-0">{item.title}</span>
            {locked ? (
              <span
                className="ml-auto inline-flex items-center justify-center rounded-full bg-primary/10 text-primary h-5 w-5 shrink-0"
                aria-label="Bloqueado — disponível nos planos pagos"
              >
                <Lock className="h-3 w-3" strokeWidth={2} />
              </span>
            ) : (
              <span className="ml-auto flex items-center gap-1.5">
                {isBeta && (
                  <span className="rounded-full bg-accent/15 text-accent border border-accent/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    Beta
                  </span>
                )}
                {badgeValue ? (
                  <span
                    className={`flex items-center justify-center rounded-full text-[10px] font-bold ${
                      isAlerts
                        ? "h-[18px] w-[18px] bg-destructive text-destructive-foreground"
                        : "h-5 min-w-5 px-1.5 bg-accent text-accent-foreground"
                    }`}
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
      <li key={item.url}>
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
      </li>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarHeader className="px-4 py-5 border-b border-border">
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
          {!collapsed && (
            <NavLink to="/dashboard" className="flex items-center">
              <span className="text-lg font-bold font-display text-primary tracking-tight">Ivero</span>
            </NavLink>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors duration-150"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-[#D0CEFE]">
        {allGroups.map((group, groupIdx) => {
          const isOpen = openSections[group.label] ?? true;
          const isAdminGroup = group.label === "Administração";

          return (
            <div
              key={group.label}
              className={groupIdx > 0 ? "mt-1 pt-2 border-t border-border/60" : ""}
            >
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(group.label)}
                  aria-expanded={isOpen}
                  className={`w-full flex items-center gap-1.5 px-3 h-7 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors ${
                    isOpen ? "text-primary" : "text-muted-foreground/70 hover:text-foreground"
                  }`}
                >
                  <ChevronRight
                    className={`h-3 w-3 shrink-0 transition-transform duration-200 ease-in-out ${
                      isOpen ? "rotate-90" : "rotate-0"
                    }`}
                  />
                  <span>{group.label}</span>
                  {isAdminGroup && (
                    <ShieldCheck className="h-3 w-3 shrink-0 text-primary/70" aria-label="Acesso restrito" />
                  )}
                  {isAdminGroup && group.info && (
                    <InfoTooltip text={group.info} />
                  )}
                </button>
              ) : null}

              <div
                className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
                style={{ maxHeight: collapsed || isOpen ? 500 : 0 }}
              >
                <ul className={`flex flex-col gap-0.5 ${collapsed ? "pt-1" : "pt-0.5 pb-1"}`}>
                  {group.items.map((item) => renderItem(item, isAdminGroup))}
                </ul>
              </div>
            </div>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border">
        <div className={`flex items-center gap-3 ${collapsed ? "flex-col" : ""}`}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-sm font-semibold text-primary-foreground cursor-default">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {displayName} · {planLabel}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-sm font-semibold text-primary-foreground shrink-0">
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
