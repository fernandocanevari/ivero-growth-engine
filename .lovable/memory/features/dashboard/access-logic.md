---
name: Trial Access Logic
description: Trial gating restritivo — só Dashboard, Diagnóstico, Score, Configurações e Assinatura ficam liberados
type: feature
---

Durante o trial de 7 dias (e enquanto o usuário não tiver assinatura paga), apenas 5 rotas ficam acessíveis: `/dashboard`, `/dashboard/diagnostico`, `/dashboard/score`, `/dashboard/configuracoes`, `/dashboard/assinatura`. Todas as outras rotas exibem a `TrialLockedPage` (tela premium com CTA para `UpgradeModal`).

Lista canônica em `src/lib/access-control.ts` (`TRIAL_ALLOWED_ROUTES`). Para liberar/bloquear uma rota basta editar essa constante.

Detecção via `useSubscriptionStatus()`: hoje considera todo usuário não-admin como em trial (sem gateway de pagamento ainda). Admins (`useUserRole().isAdmin`) ignoram o gating. O guard é aplicado uma única vez em `DashboardLayout.tsx` via `useLocation()` — não duplicar guards em páginas individuais.

Sidebar (`DashboardSidebar.tsx`) mostra ícone `Lock` + `opacity-55` nos itens bloqueados, mantendo-os clicáveis (vão pra TrialLockedPage que converte). Tooltip "Disponível nos planos pagos" no hover. Nunca esconder os itens — a visibilidade é a oportunidade de venda.

Razão estratégica: protege a metodologia (mapa de prompts, planos de ação, simulador, dominância, comparativo) que é o ativo competitivo. Trial entrega valor real (diagnóstico + score) mas não expõe o "como fazer".
