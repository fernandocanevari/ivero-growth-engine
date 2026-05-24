
## Objetivo

Criar a experiência de primeiro acesso da Ivero em 4 etapas: flag no banco, página `/welcome` com 6 feature cards, redirect pós-login condicional e estado vazio guiado no `/dashboard` para quem ainda não rodou diagnóstico.

---

## Passo 1 — Banco: `profiles.is_first_login`

Migration única:
- `ALTER TABLE public.profiles ADD COLUMN is_first_login boolean NOT NULL DEFAULT true;`
- Atualizar `public.handle_new_user()` para gravar `is_first_login = true` no insert (default já cobre, mas torna explícito).
- Backfill: `UPDATE public.profiles SET is_first_login = false` para todos os usuários existentes (eles não devem ver `/welcome` de novo).

RLS já existente em `profiles` cobre leitura e update do próprio registro — sem mudanças.

---

## Passo 2 — Página `/welcome`

Arquivo novo: `src/pages/WelcomePage.tsx`. Rota nova em `src/App.tsx` envolvida por `ProtectedRoute` (precisa estar logado).

Layout (Light theme do Dashboard, fundo `#FFFFFF`, max-width container ~1040px, padding generoso):

1. **Top bar minimalista** — logo Ivero à esquerda, link **"Pular"** à direita (text-muted, hover primary). Clicar em "Pular" = mesma ação do CTA final (seta flag e vai para `/dashboard`).

2. **Hero banner** (layout horizontal em md+, stack no mobile):
   - Bloco 64x64 rounded-2xl em `bg-primary` (roxo da marca Ivero), ícone `Sparkles` branco 32px.
   - À direita: H1 "Bem-vindo à Ivero" (28px, weight 500, Space Grotesk).
   - Parágrafo 1 (16px, muted, max-w 520px): texto do prompt sobre análise das IAs.
   - Parágrafo 2: texto do prompt sobre próximas etapas.

3. **Grid 2x3 de feature cards** (`grid-cols-1 md:grid-cols-2 gap-4`):

   | # | Título | Ícone Lucide | Tom do bg do ícone |
   |---|---|---|---|
   | 1 | Diagnóstico IA | `Stethoscope` | roxo claro |
   | 2 | Score GEO | `Gauge` | azul claro |
   | 3 | Monitoramento Multi-IA | `Radar` | teal claro |
   | 4 | Planos de Ação | `Zap` | âmbar claro |
   | 5 | Gerador de Conteúdo | `PencilLine` | verde claro |
   | 6 | Evolução Estratégica | `TrendingUp` | rosa/coral claro |

   Estilo do card (componente reaproveitável `FeatureHighlightCard`):
   - `bg-white border border-border rounded-xl p-5`
   - Ícone num quadrado 40x40 rounded-lg com bg pastel + ícone 20px (cor sólida do tom).
   - Título 15px weight 500 mt-3; descrição 13px text-muted-foreground leading-relaxed mt-1.
   - Hover: `hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-foreground/20 transition`.
   - Animações de entrada com framer-motion (stagger 0.05s).

4. **Rodapé de ação**:
   - Botão primário "Começar agora →" (h-11, rounded-lg, `bg-primary text-primary-foreground`).
   - Microcopy abaixo, 13px muted: "Você pode explorar cada funcionalidade no menu lateral a qualquer momento."

Handler `handleStart()` (compartilhado entre CTA e "Pular"):
```ts
await supabase.from("profiles").update({ is_first_login: false }).eq("user_id", user.id);
navigate("/dashboard", { replace: true });
```
Tratamento de erro: toast discreto e segue para `/dashboard` mesmo assim (não bloqueia).

Os 6 cards e suas descrições serão extraídos para `src/lib/welcome-features.ts` para reuso no Passo 4.

---

## Passo 3 — Redirect pós-login

Em `src/pages/AuthPage.tsx`, substituir os dois `navigate("/dashboard", { replace: true })` (linhas ~75 e ~93) por uma função `redirectAfterAuth(userId)`:

```ts
const { data } = await supabase
  .from("profiles")
  .select("is_first_login")
  .eq("user_id", userId)
  .maybeSingle();
navigate(data?.is_first_login ? "/welcome" : "/dashboard", { replace: true });
```

Aplicar a mesma lógica em `src/pages/ResetPasswordPage.tsx` (linha 44) por consistência.

Fallback: se a query falhar, vai para `/dashboard` (não trava acesso). A flag só é gravada como `false` dentro de `/welcome`, garantindo "nunca mostrar duas vezes" mesmo se o usuário fechar a aba.

---

## Passo 4 — Estado vazio do `/dashboard`

Hoje `DashboardOverview.tsx` tem flags hard-coded (`hasScoreData = false`...) e renderiza vários `EmptyStateCard`. Vou substituir por um modo "estado zero" único quando não existe diagnóstico.

**Detecção** — hook novo `src/hooks/useHasDiagnostic.ts`:
- Conta registros do user em `audit_reports` **ou** `analysis_history` (HEAD count, limit 1).
- Retorna `{ hasDiagnostic, isLoading }`.

**Render condicional** em `DashboardOverview.tsx`:

Quando `hasDiagnostic === false`, **substituir** todo o miolo (blocos atuais) por:

1. **Stepper horizontal no topo** (componente novo `OnboardingStepper`):
   - 4 etapas: Cadastro ✓ (verde) · **Diagnóstico IA** (roxo pulsante, atual) · Score GEO (muted) · Plano de Ação (muted).
   - Linha conectora 2px entre eles, gradiente sutil da etapa concluída até a atual.

2. **Hero empty-state card full-width**:
   - Ícone `Brain` 48px em `text-primary`.
   - H2 "Seu diagnóstico ainda não foi gerado" (24px weight 600).
   - Subtexto sobre Score GEO + lacunas + recomendações.
   - Botão "Iniciar Diagnóstico" → `navigate("/dashboard/diagnostico")` (rota correta no projeto, não `/diagnostico`).

3. **Grid 2-col dos mesmos 6 feature cards** importados de `welcome-features.ts`, mas com variante **locked**:
   - `opacity-50 grayscale`, `cursor-default`, sem hover lift.
   - Badge pequeno no canto superior direito: "Disponível após diagnóstico" (text-[10px], bg-muted, rounded-full).

Quando `hasDiagnostic === true` → comportamento atual preservado (cards com métricas e empty states granulares por seção).

`OnboardingChecklistCard` continua sendo renderizado acima de tudo (ele já tem lógica própria).

---

## Detalhes técnicos

- **Schema**: nova coluna `profiles.is_first_login boolean default true`; função `handle_new_user` atualizada.
- **Arquivos novos**:
  - `src/pages/WelcomePage.tsx`
  - `src/components/welcome/FeatureHighlightCard.tsx`
  - `src/components/dashboard/OnboardingStepper.tsx`
  - `src/hooks/useHasDiagnostic.ts`
  - `src/lib/welcome-features.ts` (array compartilhado das 6 features)
- **Arquivos alterados**:
  - `src/App.tsx` — registrar rota `/welcome` protegida.
  - `src/pages/AuthPage.tsx` — `redirectAfterAuth` nos 2 pontos.
  - `src/pages/ResetPasswordPage.tsx` — mesmo redirect.
  - `src/pages/dashboard/DashboardOverview.tsx` — bifurcação por `useHasDiagnostic`.
- **Tipos**: `src/integrations/supabase/types.ts` será regenerado automaticamente após a migration.

## Notas de UX

- Rota usada para diagnóstico é `/dashboard/diagnostico` (existente). O prompt menciona `/diagnostico`, mas vou seguir a rota real do projeto.
- Cores pastel dos ícones serão hsl com `/10` opacity dos respectivos accents para casar com o design system. Sem cores hard-coded fora dos tokens.
- O link "Pular" e o CTA chamam o mesmo handler — garante que a flag sempre vira false.
