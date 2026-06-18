
# Feature gating por plano (Presença / Influência / Autoridade)

Implementação respeitando as regras de preservação: nada é renomeado, movido ou refatorado. Apenas estendemos os arquivos existentes e adicionamos um novo componente `FeatureGate`.

## 1. `src/lib/access-control.ts` — estender (não reescrever)

Adicionar, mantendo tudo que já existe (`ALWAYS_ALLOWED`, `isRouteAllowedInTrial`, etc.):

- `export type PlanoTier = "presenca" | "influencia" | "autoridade"`
- `export const TIER_ORDER: PlanoTier[] = ["presenca", "influencia", "autoridade"]`
- `export const ROUTE_MIN_TIER: Record<string, PlanoTier>` com o mapeamento abaixo
- `export function isFeatureAvailable(pathname, plano, isPaid, isAdmin, isTrial)` — retorna boolean
- `export function getRequiredTier(pathname): PlanoTier | null`
- `export function tierLabel(tier: PlanoTier): string` ("Presença" | "Influência" | "Autoridade")

Mapeamento de rotas → tier mínimo:

```text
presenca:
  /dashboard/score
  /dashboard/auditorias
  /dashboard/conteudo          (com cota reduzida — cota já tratada em useGenerationQuota)
  /dashboard/tags-percepcao
  /dashboard/monitoramento
  /dashboard/llms-txt

influencia:
  /dashboard/dominancia
  /dashboard/sentimento
  /dashboard/comparativo
  /dashboard/pilares
  /dashboard/campanhas

autoridade:
  /dashboard/simulador
  /dashboard/prompts
  /dashboard/acoes
  /dashboard/relatorios
  /dashboard/prompt-tester
```

`ALWAYS_ALLOWED` (mantém comportamento atual + trial): `/dashboard`, `/dashboard/diagnostico`, `/dashboard/configuracoes`, `/dashboard/assinatura`, `/dashboard/ajuda`, `/dashboard/alertas`.

Regras de `isFeatureAvailable`:
- `isAdmin` → sempre true
- rota em `ALWAYS_ALLOWED` → true
- rota sem entrada em `ROUTE_MIN_TIER` → true (não regredir nada não mapeado)
- `isTrial` → libera se `plano` do trial atende ao tier (trial espelha o plano escolhido)
- `isPaid` → compara `TIER_ORDER.indexOf(plano) >= TIER_ORDER.indexOf(required)`
- caso contrário → false

## 2. `src/hooks/useSubscriptionStatus.ts`

Sem mudanças. Apenas garantir que o `plano` já exposto é usado pelos consumidores (já é).

## 3. Novo: `src/components/dashboard/FeatureGate.tsx`

```text
- Lê useLocation + useSubscriptionStatus + useUserRole
- Se isFeatureAvailable(...) → renderiza children
- Senão → renderiza <TrialLockedPage requiredTier={getRequiredTier(pathname)} />
- Enquanto loading do hook → null (ou skeleton existente do dashboard)
```

Nenhum gate é aplicado a rotas admin nem às `ALWAYS_ALLOWED`.

## 4. `src/components/dashboard/TrialLockedPage.tsx` — estender

- Adicionar prop opcional `requiredTier?: PlanoTier`
- Quando presente: ajustar título/CTA ("Disponível no plano Influência ou superior", botão "Fazer upgrade para Influência") e a lista de features mostrada
- Sem prop → comportamento atual intacto (usado pelo trial bloqueio geral)

## 5. `src/components/dashboard/DashboardSidebar.tsx` — ajuste mínimo

- Substituir a checagem atual de "locked" (`!isRouteAllowedInTrial`) por:
  `locked = !isFeatureAvailable(item.path, plano, isPaid, isAdmin, isTrial)`
- Tooltip do cadeado passa a mostrar o tier exigido via `tierLabel(getRequiredTier(item.path))`
- Continua usando o mesmo ícone/estilo de cadeado já existente

## 6. `src/App.tsx` — envolver apenas as 15 rotas gated

Para cada uma das rotas listadas em `ROUTE_MIN_TIER`, envolver o elemento da rota com `<FeatureGate>...</FeatureGate>`. Rotas `ALWAYS_ALLOWED`, admin e aninhadas ficam exatamente como estão. `ProtectedRoute` continua envolvendo tudo por fora — sem mudanças nele.

## 7. Tests

- Estender `src/lib/access-control.test.ts` com casos para `isFeatureAvailable` cobrindo:
  - admin sempre passa
  - always-allowed sempre passa (inclui `/dashboard/alertas`)
  - paid plano `presenca` bloqueia `/dashboard/simulador`
  - paid plano `autoridade` libera `/dashboard/relatorios`
  - trial com plano `influencia` libera `/dashboard/dominancia` e bloqueia `/dashboard/simulador`

## Componente reutilizado para estado "locked"

Reutilizo `TrialLockedPage` (já existe e segue o design do dashboard). Apenas adiciono a prop opcional `requiredTier` — nenhum componente novo de UI é criado além do `FeatureGate` (que é puramente lógico/roteador).

## Confirmações finais incorporadas
- `/dashboard/alertas` → `ALWAYS_ALLOWED` (sem gating)
- `/dashboard/relatorios` → tier `autoridade`
- Slugs reais usados: `score`, `dominancia`, `comparativo`, `simulador`, `prompts`, `acoes`, `relatorios`
