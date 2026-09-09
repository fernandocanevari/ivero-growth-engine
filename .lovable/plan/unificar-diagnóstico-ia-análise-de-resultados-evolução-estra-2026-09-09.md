# Unificar Diagnóstico IA + Análise de Resultados + Evolução Estratégica em "Visibilidade IA"

## 1. Fonte de dados — as 3 telas já compartilham os mesmos hooks

Verificado no código atual:

- `DiagnosticoPage.tsx` usa `useBrandSettings`, `useAuditReports`, `useAnalysisHistory` (+ snapshot da aba).
- `AuditoriasPage.tsx` usa `useAuditReports`.
- `PilaresPage.tsx` usa `useBrandSettings`, `useAuditReports`, `useAnalysisHistory`.

Como todos passam por React Query com chaves compartilhadas (`["audit-reports", userId]`, `["analysis-history", userId]`, `["brand_settings"]`), com validade de ~5 min e retenção do valor anterior, **unificar não exige nova busca**: as 3 abas dentro da mesma página vão ler exatamente o mesmo cache, e o número de requisições cai (hoje cada visita a uma tela diferente podia montar hooks separados).

Conclusão: complexidade baixa no lado de dados. Nenhuma alteração em `simulate-ai`, cálculo de score ou `pricing-rules.ts`.

## 2. Gating por plano — hoje é por rota, precisa virar por aba

Estado atual (`src/lib/access-control.ts`):

- `/dashboard/diagnostico` → `ALWAYS_ALLOWED` (todos os planos e trial).
- `/dashboard/auditorias` → tier mínimo `presenca` e liberado no trial.
- `/dashboard/pilares` → tier mínimo `influencia` (Presença hoje cai na `TrialLockedPage` inteira, via `<FeatureGate>` no `App.tsx`).

Com a unificação, a rota nova **não pode** ficar dentro de `FeatureGate`, senão Presença perderia as 3 abas. Proposta:

- Rota nova entra em `ALWAYS_ALLOWED` (como `/dashboard/diagnostico` hoje).
- O gating passa a ser **dentro da aba Evolução**: reusa `isFeatureAvailable` com o path virtual `/dashboard/pilares` (mantendo o mapa de tiers intocado) e, quando o plano não atende:
  - a aba continua clicável (não desaparece),
  - o conteúdo do gráfico é renderizado borrado/desfocado com um cadeado e o card de upgrade (mesma copy e o mesmo `requiredTier` que a `TrialLockedPage` já mostra),
  - abas Score e Histórico seguem 100% funcionais.
- Nada muda em `ROUTE_MIN_TIER`, `TIER_ORDER`, preços ou regras de plano.

## 3. Links internos e rotas que precisam de redirect

Referências encontradas hoje para as 3 rotas:

| Origem | Aponta para |
| --- | --- |
| `DashboardSidebar.tsx` | os 3 itens de menu |
| `DashboardBreadcrumb.tsx` | os 3 títulos/rotas |
| `LibrarySheet.tsx` | os 3 itens da biblioteca |
| `useDashboardOnboarding.ts` | `/dashboard/diagnostico` → `visited_diagnostico` |
| `onboarding-recommendation.ts` | `/dashboard/diagnostico` |
| `OnboardingChecklistCard.tsx`, `DashboardOverview.tsx`, `OnboardingDiagnosticoPlaceholderPage.tsx` | `/dashboard/diagnostico` |
| `PilaresPage.tsx` (empty state) | `/dashboard/diagnostico` |
| `AuditoriasPage.tsx` | `/dashboard/diagnostico` e `/dashboard/auditorias/:id` |
| `AuditoriaDetalhePage.tsx` | `/dashboard/diagnostico` e `/dashboard/auditorias` (voltar) |
| `access-control.ts` | as 3 rotas nos mapas de trial/tier/copy |
| Testes | `DashboardSidebar.test.tsx`, `DashboardBreadcrumb.test.tsx` citam os títulos |

Ou seja: sim, existem vários pontos. Para não quebrar nada, mantemos as 3 rotas antigas vivas como **redirects**:

- `/dashboard/diagnostico` → `/dashboard/visibilidade-ia`
- `/dashboard/auditorias` → `/dashboard/visibilidade-ia?aba=historico`
- `/dashboard/pilares` → `/dashboard/visibilidade-ia?aba=evolucao`

A rota de detalhe `/dashboard/auditorias/:id` **continua existindo como página própria** (é o snapshot navegável, `AuditoriaDetalhePage`), só com o botão "voltar" apontando para a aba Histórico.

## 4. Layout final proposto

- Rota nova: `/dashboard/visibilidade-ia`, com aba controlada por query string (`?aba=score|evolucao|historico`) para links diretos e redirects funcionarem.
- Abas horizontais no topo da página (componente `Tabs` do shadcn, já usado hoje no `PilaresPage`), abaixo de um cabeçalho único "Visibilidade IA" + nome da marca.
- Aba padrão: **Score** (é o conteúdo que responde "como estou agora", e substitui a tela mais visitada).
- Botão "Realizar nova análise" (com o cooldown de 30 dias) fica no cabeçalho da página, visível nas 3 abas — hoje ele está preso ao Diagnóstico.
- Estado vazio (nenhuma análise): um único `EmptyStatePage` na página inteira, em vez de 3 telas repetindo a mesma mensagem.
- Sidebar: um item só, "Visibilidade IA" (ícone `Brain`, badge beta preservado), no grupo "Visão Geral". Os itens "Análise de Resultados" e "Evolução Estratégica" saem.
- Breadcrumb e `LibrarySheet` passam a listar apenas "Visibilidade IA".
- `useDashboardOnboarding`: a marca `visited_diagnostico` passa a ser registrada na rota nova (mantendo a coluna do banco como está).

## 5. Nomes das abas

Recomendo, por serem curtos e diretos em português:

1. **Score** (alternativas: "Agora", "Diagnóstico")
2. **Evolução** (alternativas: "Tendência")
3. **Histórico** (alternativas: "Análises")

"Score Atual" também funciona, mas em telas estreitas 3 abas com duas palavras começam a quebrar; "Score" resolve.

## Detalhes técnicos

- Novo arquivo `src/pages/dashboard/VisibilidadeIAPage.tsx`: cabeçalho + `Tabs` + estado vazio único; cada aba renderiza os componentes de conteúdo extraídos das páginas atuais.
- `DiagnosticoPage`, `AuditoriasPage` e `PilaresPage` são refatoradas para exportar seus corpos como componentes de conteúdo (sem cabeçalho próprio). `DiagnosticoPage` mantém as props `snapshotOverride`/`readOnly`, porque `AuditoriaDetalhePage` depende delas.
- `App.tsx`: rota nova sem `FeatureGate`; três `<Route>` de redirect (`<Navigate replace>`) para as rotas antigas; `/dashboard/auditorias/:id` mantida.
- `access-control.ts`: adiciona `/dashboard/visibilidade-ia` em `TRIAL_ALLOWED_ROUTES` e `ALWAYS_ALLOWED`; mantém `/dashboard/pilares` no `ROUTE_MIN_TIER` para o gating da aba; adiciona a entrada de copy correspondente.
- Gating da aba: `isFeatureAvailable("/dashboard/pilares", plano, isPaid, isAdmin, isTrial)` + overlay borrado com `requiredTier`.
- Testes: atualizar `DashboardSidebar.test.tsx` e `DashboardBreadcrumb.test.tsx` para o item único; adicionar teste de que Presença vê a aba Evolução travada mas Score/Histórico livres, e de que as rotas antigas redirecionam para a aba certa.

## Fora do escopo

Nenhuma mudança em `pricing-rules.ts`, `simulate-ai`, cálculo de score, cooldown de 30 dias ou fluxo de cobrança.
