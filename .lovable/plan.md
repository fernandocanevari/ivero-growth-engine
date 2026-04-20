

## Implementação PostHog EU + 4 eventos do funil de conversão

### Configuração confirmada
- **Região**: EU Cloud (Frankfurt) — endpoint `https://eu.i.posthog.com`
- **Project token**: `phc_kyHRgaNd3gBskVfVTodQUVLfzqLfjPNroAEMDHj2gUvn`
- **Conformidade**: GDPR/LGPD-ready

### Arquivos a criar/modificar

**1. `src/lib/analytics.ts`** (novo)
Helpers tipados encapsulando `posthog-js`:
- `initAnalytics()` — chamado uma vez no boot
- `track(event, properties)` — dispara evento
- `identifyLead(email, traits)` — vincula jornada pré-cadastro pelo e-mail
- `identifyUser(userId, traits)` — vincula ao `auth.users.id` pós-signup
- `resetIdentity()` — limpa no logout

Config: `api_host: 'https://eu.i.posthog.com'`, `autocapture: false`, `capture_pageview: true`, `persistence: 'localStorage+cookie'`, `respect_dnt: true`. Em DEV, opt-out automático para não poluir métricas.

**2. `src/main.tsx`**
Chama `initAnalytics()` antes do `createRoot`.

**3. `src/components/landing/HeroSection.tsx`**
No submit do formulário (após validação Zod já existente):
```ts
identifyLead(email);
track('hero_form_submitted', { email, name, site, has_phone: !!phone, source: 'hero_form' });
```

**4. `src/pages/PreviewPage.tsx`** (2 eventos)
- Em `handleLeadSubmit` após gate desbloqueado: `track('preview_gate_unlocked', { email, score_inicial, analyzed_url })`
- No helper `goToSignup` antes do navigate: `track('signup_started', { email, cta_origin })` — passa origem do CTA como argumento (ex: `'criar_conta'`, `'subir_patamar'`)

**5. `src/pages/AuthPage.tsx`**
Após `supabase.auth.signUp` bem-sucedido:
```ts
identifyUser(user.id, { email });
track('signup_completed', { email, user_id: user.id, came_from_lead_gate });
```

**6. `src/components/dashboard/DashboardSidebar.tsx`**
Após `supabase.auth.signOut()` no botão de logout: `resetIdentity()`.

**7. `package.json`**
Adiciona `posthog-js` (~250KB, lazy-loaded internamente).

### Pós-implementação — instruções para você

Vou te enviar passo-a-passo para criar o funil no painel PostHog EU:
1. **Insights → New insight → Funnel**
2. Steps na ordem: `hero_form_submitted` → `preview_gate_unlocked` → `signup_started` → `signup_completed`
3. Conversion window: **7 dias**
4. Breakdown opcional por `cta_origin` para descobrir qual botão converte mais

### Por que essa abordagem
- **LGPD**: dados em Frankfurt, `respect_dnt` ativo, sem PII sensível
- **Jornada unificada**: `identifyLead(email)` antes do signup conecta lead anônimo ao user logado depois
- **DEV silencioso**: sua máquina não polui métricas
- **Reversível**: 1 linha em `analytics.ts` desliga tudo se necessário

