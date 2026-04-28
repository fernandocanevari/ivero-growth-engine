---
name: Suporte no Dashboard
description: Widget flutuante (WhatsApp + Email + Central de Ajuda) presente em todo /dashboard, e página /dashboard/ajuda com FAQ
type: feature
---

Widget flutuante `src/components/dashboard/SupportWidget.tsx` montado em `DashboardLayout.tsx` (fora do `<main>`, dentro do `<SidebarProvider>`). Botão circular 56px com `bg-ivero-gradient` no canto inferior direito (`fixed bottom-6 right-6 z-50`, `print:hidden`). Popover (shadcn) abre para cima/esquerda com 3 canais: WhatsApp (verde), Email (primary), Central de Ajuda (accent → navega para `/dashboard/ajuda`).

Canais oficiais centralizados em `src/lib/support.ts`:
- `WHATSAPP_NUMBER = "5514999043105"` / display `(14) 99904-3105`
- `SUPPORT_EMAIL = "contato@ivero.com.br"`
- `SUPPORT_HOURS = "Seg–Sex, 9h às 18h (BRT)"`
- Helpers `getWhatsappUrl(brandName?)` e `getMailtoUrl(brandName?)` aplicam `encodeURIComponent` e `slice(0, 80)` no brand_name (vem de input do usuário) — segurança contra injeção em URLs.

Página `/dashboard/ajuda` (`AjudaPage.tsx`): hero + 2 cards de canais diretos + Accordion com 8 FAQs (score, re-análise 30d, tags, gerador, trial, plano, marca, prazos) + faixa de horário com CTA WhatsApp. Rota incluída em `TRIAL_ALLOWED_ROUTES` — suporte sempre acessível, mesmo no trial.

**Sem item na sidebar** — acesso é exclusivamente via widget flutuante para não poluir a navegação. Tracking PostHog: `support_widget_opened`, `support_channel_clicked` com `{ channel: "whatsapp"|"email"|"help_center", source? }`.
