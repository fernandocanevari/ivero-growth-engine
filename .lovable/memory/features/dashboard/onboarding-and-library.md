---
name: Dashboard Onboarding & Library
description: Card "Por onde começar" no /dashboard + Biblioteca Ivero no header com 20 entradas
type: feature
---

Duas melhorias de UX para reduzir churn nos primeiros 30 dias:

1. **Card "Por onde começar"** (`OnboardingChecklistCard`) renderizado no topo de `/dashboard`. Checklist de 4 etapas:
   - Diagnóstico IA → marcado quando visita `/dashboard/diagnostico`
   - Adicionar concorrente → marcado quando `brand_settings.main_competitor` existir
   - Score GEO → marcado ao visitar `/dashboard/score`
   - Plano de Ação → marcado ao visitar `/dashboard/acoes`
   Progresso persistido em `dashboard_onboarding_progress` (RLS por user_id, admins veem tudo). Card some sozinho quando todas as etapas ficam true. Tracking automático via `useTrackOnboardingVisit` em `DashboardLayout`.

2. **Biblioteca Ivero** (`LibrarySheet`) — botão "Biblioteca" (ícone BookOpen) no header do dashboard que abre `Sheet` lateral. Lista 20 páginas agrupadas em Visão Geral / Inteligência / Ações / Extras com 4 campos cada: O que é, Para que serve, Quando usar, botão "Ir para [página] →". Campo de busca sticky no topo filtra por nome. Não há rota dedicada — só painel lateral em qualquer página do `/dashboard`.

Não alterar Central de Ajuda nem outras páginas.
