---
name: Tags de Percepção da IA
description: Página /dashboard/tags-percepcao no grupo Inteligência traduz scores dos 5 pilares em tags verde/amarelo/vermelho com veredito mestre e timeline
type: feature
---

Nova página executiva no grupo **Inteligência** do dashboard. Não coleta dados novos — lê a última linha (e o histórico) de `analysis_history` e traduz cada score em tags semânticas.

## Regra de classificação
- score > 80 → 🟢 verde (emerald-100/700)
- score 50–80 → 🟡 amarelo (amber-100/700)
- score < 50 → 🔴 vermelho (red-100/700)

Cada pilar gera 2 tags (proposição + impacto). Dicionário em `src/lib/perception-tags.ts` (`PERCEPTION_TAGS_BY_PILLAR`). Função pura `pillarToTags(pillar, score)`.

## Veredito mestre
Responde literalmente: *"Este site tem sinais suficientes para ser recomendado por uma IA?"*
- ≥3 verdes E 0 vermelhas → SIM, com solidez
- ≥2 vermelhas OU 0 verdes → INSUFICIENTE
- caso contrário → PARCIALMENTE

Calculado por `computeVerdict(tags)`.

## Persistência
Coluna `analysis_history.perception_snapshot jsonb` armazena `{ tags, verdict, computed_at }` no momento do audit. `useAnalysisHistory.runAnalysis` calcula via `buildPerceptionSnapshot` e grava no mesmo INSERT. Registros antigos com `{}` são reidratados em runtime pela página via mesma função pura — sem migração de dados pesada. RLS herdada de `analysis_history`.

## Naming
"Relevância" no UI = `experience_score` no DB (mesma convenção de DiagnosticoPage e GeradorConteudoPage).

## Acesso
Rota `/dashboard/tags-percepcao` **NÃO** está em `TRIAL_ALLOWED_ROUTES` — bloqueada para trial, exibe TrialLockedPage com copy específica em `LOCKED_ROUTE_INFO`. Liberada para planos pagos e admins.

## Componentes
- `src/lib/perception-tags.ts` — lógica pura + dicionário + tipos
- `src/components/dashboard/PerceptionTagBadge.tsx` — badge tipado por tone
- `src/pages/dashboard/TagsPercepcaoPage.tsx` — página com Veredito + grid de pilares + timeline das últimas 5 auditorias

## Nuvem de Percepção (lexical)
Camada complementar às tags semânticas: termos concretos com que as IAs descrevem a marca, extraídos no `simulate-ai` (modo `diagnostico`) via tool calling `extract_keywords` no Lovable AI Gateway. Persistido em `analysis_history.keyword_cloud` (jsonb, default `[]`).

- Estrutura por entrada: `{ term, frequency, sentiment, mentioned_in_models, examples: [{quote, model}], models: [{model, count}] }` — top 30. `examples`/`models` opcionais (auditorias antigas seguem válidas).
- Origem: justificativas dos pilares e critérios das 5 IAs no Diagnóstico (corpus). PreviewPage propaga `keyword_cloud` para `sessionStorage:ivero:lastDiagnostic`; `DiagnosticoPage.handleReanalyze` reaproveita ao gravar.
- UI nuvem (`KeywordCloudSection.tsx`): toggle Atual/Comparar, fonte 12-36px proporcional à frequência, cor por sentimento (emerald/cinza/red), tooltip com nº de modelos+menções, badge "novo" para termos surgidos, line-through para removidos. Cada termo é `<button>` clicável que abre o detalhe.
- UI detalhe (`KeywordDetailSheet.tsx`): Sheet lateral com força do termo por modelo (barras proporcionais, badge "mais forte" no topo) e lista de exemplos de frases reais com atribuição ao modelo de origem.
- Helpers puros em `src/lib/keyword-cloud.ts`: `mergeCloudsAcrossPeriod` (preserva exemplos dedup e soma counts por modelo), `diffCloud`, `fontSizeFor`, `countsBySentiment`, `totalMentions`. Respeitam o filtro 7/30/90/all.
- Auditorias antigas (cloud `[]` ou sem `examples`/`models`) mostram fallback "rode novo Diagnóstico" no sheet, sem quebrar.

## Fora do escopo
Editor manual de tags, alertas de mudança de cor, exportação dedicada em PDF, granularidade por modelo de IA na nuvem agregada (a granularidade existe agora dentro do detalhe de cada termo).
