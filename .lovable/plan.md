

## Nuvem de Palavras de Percepção

Adicionar à página **Tags de Percepção da IA** uma nuvem visual com os termos que as IAs mais associam à marca — extraídos das respostas reais dos 5 modelos no diagnóstico (ChatGPT, Gemini, Claude, Perplexity, GPT-5).

### Por que isso responde ao seu pedido

No exemplo da Marca Galo, queremos ver "rápido cozimento", "instantâneo", "ingredientes frescos" porque essas são as **palavras que as IAs realmente usariam ao recomendar a marca**. Hoje as tags são *categorias semânticas* (verde/amarelo/vermelho); a nuvem é a camada **lexical** — o vocabulário concreto que define como o site é percebido.

### Decisões de produto

- **Onde aparece:** nova seção dentro de `/dashboard/tags-percepcao`, abaixo do "Comparativo vs auditoria anterior" e antes de "Percepções por pilar". Mesma página, sem nova rota — mantém a leitura como um fluxo único.
- **Origem dos termos:** extraídos das **respostas das 5 IAs** capturadas no `simulate-ai` durante o Diagnóstico. É a única fonte que reflete *como a IA fala da marca*.
- **Persistência:** salvos junto com cada auditoria em `analysis_history`, em uma nova coluna `keyword_cloud` (JSONB). Isso garante que a nuvem **não se perde** ao navegar e fica historicamente comparável (mesma garantia das tags).
- **Filtro:** respeita o seletor de período (7/30/90/Tudo) já existente — agrega termos do conjunto filtrado quando o usuário escolhe um período mais longo.
- **Tom positivo/negativo/neutro:** cada termo é classificado por sentimento via heurística leve (lista de adjetivos/substantivos com peso) → cor verde/cinza/vermelha na nuvem.
- **Top 30 termos:** limite para manter legibilidade (Awwwards-friendly, sem poluição visual).

### Layout (inserido na página existente)

```text
┌──────────────────────────────────────────────────────────────────┐
│ NUVEM DE PERCEPÇÃO · como as IAs falam da sua marca               │
│ [Atual] [Comparar com anterior]                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│      ingredientes frescos    RÁPIDO COZIMENTO                     │
│   tradicional        INSTANTÂNEO       qualidade                  │
│        massa premium     prática      receita caseira             │
│             cozinha brasileira    saboroso                        │
│                                                                   │
│  🟢 32 termos positivos · ⚫ 8 neutros · 🔴 3 negativos             │
│  Termos vindos de 5 modelos · 124 menções analisadas              │
└──────────────────────────────────────────────────────────────────┘
```

- Tamanho da fonte: proporcional à frequência (clamp 12px–36px).
- Cor: verde-emerald / cinza / vermelho conforme sentimento.
- Hover em um termo → tooltip "mencionado por 4 de 5 IAs · 12 vezes".
- Toggle "Comparar com anterior" → mostra termos novos em destaque (badge "novo") e termos que sumiram (riscados em cinza).

### Lógica de extração (server-side, no Diagnóstico)

Roda dentro de `simulate-ai` ao final, depois das 5 respostas voltarem:

1. Concatena as 5 respostas em um único texto.
2. Chama Lovable AI Gateway (`google/gemini-3-flash-preview`) com **tool calling** (`extract_keywords`) pedindo:
   - até 30 termos/expressões (1–4 palavras) que melhor descrevem a marca segundo as respostas;
   - para cada termo: `{ term, frequency, sentiment: 'positive'|'neutral'|'negative', mentioned_in_models: number }`.
3. Retorna o JSON estruturado junto com os scores. O `useAnalysisHistory.runAnalysis` salva em `analysis_history.keyword_cloud`.

Por que IA e não regex/n-grams: queremos *frases-conceito* ("rápido cozimento", "ingredientes frescos") e não bigramas literais — n-grams puros geram ruído ("e o", "com a"). O custo é 1 chamada/auditoria.

### Persistência

```sql
ALTER TABLE analysis_history
  ADD COLUMN keyword_cloud jsonb NOT NULL DEFAULT '[]'::jsonb;
```

Estrutura:
```json
[
  { "term": "rápido cozimento", "frequency": 12, "sentiment": "positive", "mentioned_in_models": 4 },
  { "term": "ingredientes frescos", "frequency": 8, "sentiment": "positive", "mentioned_in_models": 3 },
  { "term": "embalagem datada", "frequency": 2, "sentiment": "negative", "mentioned_in_models": 1 }
]
```

- RLS herda as policies existentes da tabela.
- Linhas antigas ficam com `[]`. A UI mostra empty state ("rode um novo Diagnóstico para gerar a nuvem de percepção") só nessa seção, sem quebrar o resto da página.

### Arquitetura técnica

**Novos arquivos**
- `src/lib/keyword-cloud.ts` — tipos `KeywordCloudEntry`, `KeywordSentiment` + helpers (`mergeCloudsAcrossPeriod`, `diffCloud`, `fontSizeFor`).
- `src/components/dashboard/KeywordCloudSection.tsx` — render da nuvem com toggle Atual/Comparar, contadores de sentimento e empty state.

**Editados**
- `supabase/functions/simulate-ai/index.ts` — após as 5 respostas, chama `extract_keywords` no Lovable AI Gateway (tool calling) e devolve `keyword_cloud` no payload (apenas em `mode: 'preview'` / diagnóstico — não nos modos `simulator`/`tester`).
- `src/pages/PreviewPage.tsx` — propaga `keyword_cloud` recebida para o salvamento.
- `src/hooks/useAnalysisHistory.ts` — `runAnalysis` aceita `keyword_cloud` opcional e grava no insert; tipo `AnalysisRecord` ganha o campo.
- `src/pages/dashboard/TagsPercepcaoPage.tsx` — monta a `KeywordCloudSection` com base em `lastAnalysis.keyword_cloud` (e `previousAnalysis.keyword_cloud` para o comparativo), respeitando o filtro de período.
- `src/integrations/supabase/types.ts` — regenerado pela migração.
- Migração SQL: `ADD COLUMN keyword_cloud jsonb NOT NULL DEFAULT '[]'::jsonb`.
- `mem://features/dashboard/perception-tags` (atualizar) + `mem://index.md`.

### Fora do escopo

- Edição manual de termos (são derivados das respostas reais — editar quebraria a auditabilidade).
- Nuvem por modelo individual (ChatGPT vs Gemini vs Claude) — fica como fase 2 se houver demanda.
- Exportação separada da nuvem em PNG (entra na exportação geral de Relatórios).
- Reextração retroativa de auditorias antigas — backfill manual via re-análise quando o usuário rodar o próximo Diagnóstico.

