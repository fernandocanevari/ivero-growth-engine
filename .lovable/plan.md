# Piscada ao navegar entre as telas de "Visão Geral"

## Reproduzido

Rodei um teste isolado que monta a tela, espera os dados, desmonta (como acontece ao trocar de item do menu) e monta de novo. Resultado dos quadros de tela na volta:

```text
1ª tela após revisitar: 0 registros, "carregando = falso"  -> depois: 1 registro
```

Ou seja: mesmo com os dados já em cache, o primeiro instante da tela revisitada acha que **não existe nada** e não se considera carregando — então a página mostra o estado vazio (ou tela em branco) por uma fração de segundo antes de trocar pelo conteúdo real. É exatamente a piscada relatada.

## Causa raiz exata

As quatro telas de "Visão Geral" são as únicas que dependem de dados presos ao identificador do usuário, resolvido de novo a cada montagem:

- `src/hooks/useAuditReports.ts` e `src/hooks/useAnalysisHistory.ts` descobrem o usuário dentro de um efeito a cada montagem. Enquanto o usuário não é resolvido, a consulta fica desabilitada com chave "usuário nulo": sem dados e sem sinal de carregamento. Só no segundo passo a chave vira a do usuário e o cache aparece.
- Nenhuma dessas consultas tem tempo de validade (`staleTime`) nem retenção do valor anterior (`placeholderData`), então cada navegação também refaz a busca do zero.
- `src/hooks/useHasDiagnostic.ts` não usa cache nenhum (é `useState` + efeito): a cada montagem volta para "carregando", e o Painel faz `if (isLoading || loadingDiag) return null` (`DashboardOverview.tsx:64`) — tela em branco garantida em toda visita.
- As telas somem/aparecem porque cada uma corta a renderização nesse instante: `PilaresPage.tsx:390` (`return null` + estado vazio quando não há relatório), `DiagnosticoPage.tsx:265` (skeleton), `AuditoriasPage` (skeleton/estado vazio), `DashboardOverview.tsx:64` (`return null`).

Por que as outras telas não piscam: elas leem só `useBrandSettings` (chave fixa `["brand_settings"]`, sem dependência de usuário) ou hooks já estabilizados. O cache responde no primeiro render e não há janela de "sem dados". Exceção parcial: `TagsPercepcaoPage` usa `useAnalysisHistory` e tende ao mesmo sintoma, só menos visível.

## Sobre o card "Comece por aqui"

É específico do Painel: `RecommendedToolCard` é usado apenas em `DashboardOverview.tsx`. Ele já recebeu a correção de estabilidade (esconde só na primeira carga, animação uma única vez, consulta de onboarding com `staleTime`). O que ainda o faz desaparecer ao revisitar o Painel é o `return null` da página inteira acima dele, causado por `useHasDiagnostic` — não o card em si.

## Correção proposta (para aprovação)

1. Resolver o usuário uma única vez em cache compartilhado (uma consulta `["auth-user"]` com validade longa) e usá-la em `useAuditReports`/`useAnalysisHistory`, eliminando a janela de "usuário nulo".
2. Dar a essas consultas `staleTime` de ~5 minutos, retenção do valor anterior e sem refazer busca em cada montagem/foco — mesmo tratamento já aplicado em `useOnboardingResponses`.
3. Converter `useHasDiagnostic` em consulta com cache (mesma política), para o Painel não voltar a "carregando" em cada visita.
4. Ajustar os cortes de renderização das quatro telas: mostrar skeleton/estado vazio apenas na primeira carga real; em revalidação, manter o conteúdo já conhecido em tela.
5. Aplicar o mesmo em `TagsPercepcaoPage` (mesma origem de dados) para não deixar o sintoma vivo em outro menu.
6. Verificação: teste automatizado de "monta → desmonta → monta" garantindo que nenhum quadro intermediário mostre estado vazio, mais navegação manual repetida entre Painel, Diagnóstico, Análise de Resultados e Evolução Estratégica.

## Observação

Não consegui validar navegando logado no app aqui (este projeto usa Supabase externo, sem sessão de teste disponível); a reprodução foi feita pelo teste de montagem/desmontagem descrito acima, que reproduz exatamente o instante da piscada.
