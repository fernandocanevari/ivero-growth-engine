
## Suporte no Dashboard + decisão sobre blog

### 1. Widget flutuante de suporte (todas as páginas do dashboard)

Botão circular fixo no canto inferior direito, presente em todas as rotas de `/dashboard/*`. Ao clicar, abre um popover compacto com 3 atalhos:

- **WhatsApp** — abre `https://wa.me/5514999043105?text=...` em nova aba, com mensagem pré-preenchida ("Olá, sou cliente Ivero e preciso de ajuda com…") e nome da marca do usuário quando disponível (vindo de `useBrandSettings`).
- **Email** — `mailto:contato@ivero.com.br?subject=Suporte Ivero - {brand_name}`.
- **Central de Ajuda** — link interno para `/dashboard/ajuda`.

Detalhes visuais:
- Botão: 56px, gradiente Ivero (`bg-ivero-gradient`), ícone `MessageCircle` (Lucide), sombra `shadow-lg`, `z-50`, animação suave de hover (scale 1.05).
- Popover (shadcn `Popover`): tema light alinhado ao dashboard, header "Precisa de ajuda?", subtítulo "Resposta em até 1 dia útil", os 3 itens em lista vertical com ícones (`MessageCircle` verde para WhatsApp, `Mail` para email, `LifeBuoy` para Ajuda).
- Esconde no mobile abaixo do hero do onboarding wizard (não cobrir CTAs do wizard).
- Track PostHog: `support_widget_opened`, `support_channel_clicked` com `channel: whatsapp|email|help_center`.

### 2. Página `/dashboard/ajuda` — Central de Ajuda

Página light alinhada ao tema do dashboard, com:

- **Hero curto**: "Como podemos ajudar?" + parágrafo explicativo + 2 botões grandes lado a lado (WhatsApp / Email).
- **Seção FAQ** (Accordion shadcn) com 6–8 perguntas iniciais cobrindo: como interpretar o score, periodicidade da re-análise (30 dias), o que são as Tags de Percepção, como usar o Gerador de Conteúdo, limites do trial, como cancelar/upgradar plano, como trocar a marca monitorada, prazos de suporte.
- **Card "Falar com o time"**: dois canais oficiais (WhatsApp 14 99904-3105 e contato@ivero.com.br) com horário de atendimento (seg–sex, 9h–18h).

Adicionada à `App.tsx` como rota filha de `/dashboard` e incluída em `TRIAL_ALLOWED_ROUTES` (suporte sempre acessível, mesmo no trial).

Item na sidebar **não** será adicionado para não poluir a navegação — o acesso é via widget flutuante em toda página. Item da rota fica como destino interno do widget.

### 3. Blog na landing — adiado

Conforme sua resposta, o blog não será feito agora. Não vou tocar em landing/`Footer.tsx` nem criar tabelas ou rotas de blog. Quando quiser retomar, sugiro decidirmos entre CMS próprio (Supabase + admin), MDX estático ou vitrine com link externo.

### Detalhes técnicos

- **Novo componente** `src/components/dashboard/SupportWidget.tsx` — botão + Popover, montado dentro de `DashboardLayout.tsx` (fora do `<main>`, irmão do `<SidebarProvider>` filho, para flutuar sobre tudo).
- **Constantes** `WHATSAPP_NUMBER = "5514999043105"` e `SUPPORT_EMAIL = "contato@ivero.com.br"` em `src/lib/support.ts` (helpers `getWhatsappUrl(brandName?)` e `getMailtoUrl(brandName?)` com `encodeURIComponent` em todas as queries — segurança contra injection em URLs).
- **Nova página** `src/pages/dashboard/AjudaPage.tsx` (FAQ usa `Accordion` já presente em `src/components/ui/accordion.tsx`).
- **Rotas**: adicionar `<Route path="ajuda" element={<AjudaPage />} />` em `App.tsx`.
- **Trial gating**: incluir `/dashboard/ajuda` em `TRIAL_ALLOWED_ROUTES` em `src/lib/access-control.ts`.
- **Sem migrations**, sem novas tabelas, sem edge functions — feature 100% client-side.
- **Sem mudanças** no Footer da landing, no `OnboardingWizard`, nas tags de percepção ou em qualquer outra feature.

### Fora do escopo

- Blog (adiado por sua decisão).
- Chat interno persistido em banco (`support_messages`).
- Notificações por email para o admin quando alguém abrir suporte.
- Item de "Ajuda" na sidebar (acesso fica via widget flutuante).
