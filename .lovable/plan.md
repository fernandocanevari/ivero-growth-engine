# Plano: QA Pré-Lançamento (Itens 2, 3 e 4)

Objetivo: deixar o dashboard pronto para teste manual confiável, eliminando links quebrados, estados de erro silenciosos e regressões em fluxos críticos.

---

## Etapa 1 — Auditoria de Navegação e Links

Varredura estática do código sem mudança de comportamento. Entrega um **relatório no chat** com:

1. **Rotas órfãs**: páginas em `src/pages/dashboard/*` que existem em `App.tsx` mas não têm link no `DashboardSidebar` nem em outras páginas (ex: `AdminRespostasPage`).
2. **Links quebrados**: todo `<NavLink>`, `<Link>`, `navigate()`, `<a href>` cujo destino não bate com nenhuma rota declarada em `App.tsx`.
3. **Inconsistências sidebar × access-control**: itens marcados como bloqueados no trial sem entrada em `LOCKED_ROUTE_INFO` (cairiam no fallback genérico).
4. **CTAs sem destino**: botões "Ver mais", "Detalhes", "Configurar" que não disparam navegação ou modal.
5. **Botões/abas/tooltips sem handler**: `onClick` ausente em elementos clicáveis.

Saída: lista priorizada (Crítico / Alto / Médio) com arquivo + linha. Sem editar nada nesta etapa — você decide o que corrigir.

---

## Etapa 2 — Análise de Estados de Erro e Edge Cases

Auditoria focada nos pontos onde o usuário fica "no escuro":

1. **Chamadas Supabase sem tratamento de erro** (`.from().select()` / `.insert()` / `.update()` sem `if (error)` ou sem `toast`).
2. **Loading states ausentes**: páginas que renderizam dados sem skeleton ou "Carregando…".
3. **Acesso a campos null/undefined** que podem quebrar a UI (`data.foo.bar` sem optional chaining).
4. **Empty states faltando**: listas que renderizam vazio sem `EmptyStateCard`.
5. **Edge functions sem feedback**: `simulate-ai`, `generate-content`, etc. sem toast de erro/timeout.
6. **Forms sem validação visível**: submits que falham silenciosamente.

Saída: relatório com correções sugeridas. Implemento as correções **Críticas/Altas** automaticamente (toast de erro, optional chaining, empty states). Médias ficam para você priorizar.

---

## Etapa 3 — Testes Automatizados de Fluxos Críticos

Setup já existe (`vitest`, `src/test/setup.ts`, `src/test/example.test.ts`). Adiciono testes para os fluxos que mais doem se quebrarem:

1. **`access-control.test.ts`** — `isRouteAllowedInTrial` e `getLockedRouteInfo` (matriz de rotas allowed/blocked, fallback de sub-rotas, normalização de trailing slash).
2. **`useSubscriptionStatus.test.ts`** — admin ignora trial, usuário pago ignora trial, default = trial.
3. **`perception-tags.test.ts`** — geração das tags verde/amarelo/vermelho a partir de scores.
4. **`pricing-rules.test.ts`** — cálculo de desconto anual (20%) e herança de features entre planos.
5. **`format-phone.test.ts`** — máscara BR.
6. **Smoke render** de `DashboardSidebar`, `TrialBanner`, `TrialLockedPage` (renderiza sem erro com mocks mínimos).

Não vou testar componentes pesados que dependem de Supabase real — o foco é lógica pura e renderização, que pegam 80% das regressões com 20% do esforço.

---

## Ordem de execução

1. Rodo Etapa 1 → entrego relatório.
2. Rodo Etapa 2 → entrego relatório + aplico correções Críticas/Altas.
3. Rodo Etapa 3 → escrevo testes, executo `vitest`, ajusto até passar tudo verde.

## Detalhes técnicos

- Uso `rg` para varreduras (NavLink, navigate, .from\(, onClick=).
- Cruzo destinos com a lista de rotas extraída de `App.tsx`.
- Testes ficam em `src/**/*.test.ts(x)` conforme `vitest.config.ts`.
- Não toco em `src/integrations/supabase/types.ts` nem em schema do banco.
- Nenhuma migração de DB nesta entrega.

## Fora do escopo

- Refactor de componentes.
- Mudanças visuais.
- Testes E2E com browser real (poderia ser próximo passo se quiser).
- Cobertura 100% — foco é fluxo crítico, não métrica.
