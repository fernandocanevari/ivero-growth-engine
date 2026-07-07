# Plano consolidado — fonte única de preços + UpgradeModal com destaque dinâmico

## Objetivo
`src/lib/pricing-rules.ts` passa a ser a única fonte de nomes, preços, métricas e highlights dos planos. `UpgradeModal` é reconstruído sem o plano "Domínio", com preços corretos e destaque dinâmico baseado no plano atual do cliente logado. Valores efetivamente cobrados (397/717/1.197 anual) permanecem intactos.

## Etapa 1 — Estender `src/lib/pricing-rules.ts`
Adicionar aos objetos `PLANOS` (sem quebrar consumidores atuais):
- `badge: string | null` — "Mais escolhido" só em Influência (default landing)
- `highlighted: boolean` — true só em Influência (default landing)
- `inheritsFrom: string | null`

Adicionar helpers exportados:
- `formatBRL(n: number): string` → "R$ 1.497"
- `annualSavingBRL(plano): string` → "R$ 3.600" (calculado como `(monthly − annual) × 12`)
- `PLANOS_ARRAY: PlanoInfo[]` (ordem Presença → Influência → Autoridade)
- `nextTier(plano): "influencia" | "autoridade"` — regra dos 4 casos:
  - `"presenca"` → `"influencia"`
  - `"influencia"` → `"autoridade"`
  - `"autoridade"` → `"autoridade"` (mesmo tier, sinaliza "atual")
  - `null` → `"influencia"` (fallback landing)

Nenhum campo existente muda de tipo. `monthlyPrice`/`annualPrice` seguem `number`.

## Etapa 2 — Refatorar `src/components/landing/InvestSection.tsx`
- Remover array `plans` hardcoded (linhas 25–99).
- Importar `PLANOS_ARRAY`, `formatBRL`, `annualSavingBRL`.
- Manter local: `PLAN_SLUG_MAP`, mapa de ícones por métrica (decoração), CTAs por plano ("Quero ser visto pelas IAs →" etc.).
- Render pixel-idêntico ao atual.

## Etapa 3 — Refatorar `src/pages/EscolherPlanoPage.tsx`
- Remover array `plans` local (linhas 27–96).
- Importar de `pricing-rules.ts`.
- CTA único ("Começar com 7 dias grátis →") continua como constante local.

## Etapa 4 — Refatorar `supabase/functions/create-checkout/index.ts`
Restrição: Deno edge não importa de `src/`. Criar `supabase/functions/_shared/pricing.ts` com apenas:
```ts
export const PLAN_ANNUAL_VALUES = { presenca: 397, influencia: 717, autoridade: 1197 };
```
Importar do edge. Adicionar em `pricing-rules.test.ts` uma asserção que trava divergência entre `PLANOS[k].annualPrice` e esses valores (se um dia mudarem, o teste falha). Nenhuma outra mudança na função — fluxo Asaas, insert em `assinaturas` e valor cobrado intactos.

## Etapa 5 — Reconstruir `src/components/dashboard/UpgradeModal.tsx`
- **Remover** `PLANS` hardcoded e o plano "Domínio" completo.
- Grid volta a `xl:grid-cols-3` (era `xl:grid-cols-4`).
- Importar `PLANOS_ARRAY`, `formatBRL`, `annualSavingBRL`, `nextTier` de `pricing-rules.ts`.
- Manter local: ícones das métricas, CTAs por plano ("Garantir presença" / "Ampliar influência" / "Consolidar autoridade").
- Manter `highlights.slice(0, 2)` para preservar densidade visual do modal.

**Destaque dinâmico** — consumir `useSubscriptionStatus()`:
```
loading            → nenhum card destacado, sem badge (evita flash)
plano = presenca   → destaca Influência, badge "Próximo passo"
plano = influencia → destaca Autoridade, badge "Próximo passo"
plano = autoridade → destaca Autoridade, badge "Seu plano atual"
plano = null       → destaca Influência, badge "Mais escolhido"
```

`highlighted` e `badge` do `pricing-rules.ts` são apenas defaults — o modal computa os seus a partir de `nextTier(plano)` e sobrescreve no render. Preservar 100% do layout, cores, animações, sub-modal "Falar com o time" e eventos `track()`.

## Etapa 6 — Verificar 4 call sites do modal
Sem mudança de código, só confirmação visual: `AssinaturaPage`, `GeradorConteudoPage`, `TrialLockedPage`, `TrialBanner` abrem o modal e renderizam os 3 planos com destaque dinâmico correto.

## Fora do escopo (não vou tocar)
`ProtectedRoute.tsx`, `useSubscriptionStatus.ts`, `access-control.ts`, `FeatureGate.tsx`, `handle_new_user_trial`, fluxo Asaas, valores cobrados, gating por plano, unique constraint em `assinaturas`.

## Consumidores atuais de `PLANOS` que continuam funcionando
`pricing-rules.test.ts`, `onboarding-recommendation.ts`, `RecusaModal.tsx`, `PropostaComercialPage.tsx`, `OnboardingPerguntasPage.tsx`, `responder-proposta/index.ts` — apenas adiciono campos, não removo nem renomeio.

## Checklist de validação (reporto item a item ao final)
- [ ] `pricing-rules.ts` estendido com `badge`, `highlighted`, `inheritsFrom`, `formatBRL`, `annualSavingBRL`, `PLANOS_ARRAY`, `nextTier` — consumidores atuais sem quebra
- [ ] `_shared/pricing.ts` criado + teste de sincronia com `pricing-rules.ts`
- [ ] `InvestSection.tsx` lê de `pricing-rules.ts` — landing pixel-idêntica
- [ ] `EscolherPlanoPage.tsx` lê de `pricing-rules.ts` — checkout inalterado
- [ ] `create-checkout/index.ts` importa de `_shared/pricing.ts` — valores 397/717/1.197 intactos
- [ ] `UpgradeModal.tsx` reconstruído: sem "Domínio", 3 planos, preços 497/897/1.497 mensal e 397/717/1.197 anual, destaque dinâmico via `useSubscriptionStatus + nextTier`, sem flash no loading
- [ ] 4 call sites do modal verificados
- [ ] Zero mudança em ProtectedRoute, access-control, FeatureGate, gating, trigger, unique constraint
