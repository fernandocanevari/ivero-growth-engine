

## Implementar PostHog Cloud EU + 4 eventos do funil de conversão

### Pré-requisito (do seu lado)
1. Criar conta em https://eu.posthog.com (região **EU/Frankfurt**)
2. Criar projeto "Ivero"
3. Copiar a **Project API Key** (formato `phc_...`) e colar no chat

### O que vou implementar

#### 1. Instalar e inicializar o PostHog
- Adicionar dependência `posthog-js`
- Criar `src/lib/analytics.ts` com inicialização única usando endpoint EU (`https://eu.i.posthog.com`)
- Inicializar no `src/main.tsx` antes do `createRoot`
- Configurações: `capture_pageview: true`, `persistence: 'localStorage+cookie'`, `autocapture: false` (controle manual para evitar ruído)

#### 2. Helper de tracking tipado
Funções utilitárias em `src/lib/analytics.ts`:
- `track(event, properties)` — envia evento
- `identifyLead(email, traits)` — vincula eventos a um lead pelo e-mail (pseudo-anônimo até signup)
- `identifyUser(userId, traits)` — vincula ao `auth.users.id` após cadastro completo
- `resetIdentity()` — chama no logout

#### 3. Os 4 eventos do funil

| Evento | Onde dispara | Properties enviadas |
|---|---|---|
| `hero_form_submitted` | `HeroSection.tsx` após validação Zod OK e antes de navegar para `/preview` | `email`, `name`, `site`, `has_phone`, `source: 'hero_form'` |
| `preview_gate_unlocked` | `PreviewPage.tsx` em `handleLeadSubmit` após validação OK e `setLeadSubmitted(true)` | `email`, `score_inicial`, `analyzed_url` |
| `signup_started` | `PreviewPage.tsx` dentro do helper `goToSignup` antes do `navigate` | `email`, `cta_origin` (qual botão: "criar conta", "subir patamar", etc.) |
| `signup_completed` | `AuthPage.tsx` após `supabase.auth.signUp` com sucesso | `email`, `user_id`, `came_from_lead_gate: boolean` |

Em cada evento, chamar `identifyLead(email)` antes do `track()` para que o PostHog conecte os 4 eventos como **uma jornada única**.

#### 4. Logout limpa identidade
No botão de logout (provavelmente `DashboardSidebar.tsx`), chamar `resetIdentity()` após `supabase.auth.signOut()` — evita misturar sessões de leads diferentes no mesmo navegador.

#### 5. Configurar funil no painel PostHog (instruções pós-implementação)
Vou te mandar prints/passo-a-passo para criar o funil:
- PostHog → Insights → New → Funnel
- Steps: `hero_form_submitted` → `preview_gate_unlocked` → `signup_started` → `signup_completed`
- Conversion window: 7 dias
- Breakdown opcional por `source` ou `cta_origin`

### Detalhes técnicos
- **LGPD**: PostHog EU + `respect_dnt: true` (respeita "Do Not Track" do navegador). Sem cookie banner agora — adicionamos depois se necessário.
- **Chave pública**: `phc_...` é segura no bundle do cliente (igual GA). Vou colocar como constante em `src/lib/analytics.ts` (não precisa de `.env` nem secret de build).
- **Sem PII sensível**: enviamos e-mail e nome (já temos consentimento implícito ao preencher form). NUNCA enviamos senha, telefone completo, CPF.
- **Dev vs prod**: PostHog inicializa em ambos, mas com `loaded: (ph) => { if (import.meta.env.DEV) ph.opt_out_capturing() }` para não poluir métricas durante desenvolvimento.

### Arquivos modificados
- `package.json` — adiciona `posthog-js`
- `src/lib/analytics.ts` — **novo**, init + helpers `track`, `identifyLead`, `identifyUser`, `resetIdentity`
- `src/main.tsx` — chama `initAnalytics()` antes do render
- `src/components/landing/HeroSection.tsx` — `track('hero_form_submitted', ...)` no submit
- `src/pages/PreviewPage.tsx` — `track('preview_gate_unlocked', ...)` no gate, `track('signup_started', ...)` no `goToSignup`
- `src/pages/AuthPage.tsx` — `track('signup_completed', ...)` após signup OK + `identifyUser`
- `src/components/dashboard/DashboardSidebar.tsx` — `resetIdentity()` no logout

### Quando você voltar
Cole a chave assim:
> "Aqui está: `phc_aB3xK9...`"

Aprovo o plano agora e implemento na hora seguinte.

