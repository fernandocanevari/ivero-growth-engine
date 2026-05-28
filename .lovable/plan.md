## Fase 2 — Injeção de contexto geográfico nas 3 edge functions principais

A Fase 1 (campo `coverage_*` em `brand_settings`, UI no Diagnóstico/Configurações, helper `getGeoContext()`) já está pronta. Nenhuma edge function consome esse contexto ainda — esta fase faz só a injeção, sem mexer em score, schema, UI ou pilares.

### 1. `simulate-ai` (5 LLMs)

- Aceita novo campo opcional `geoContext?: string` (máx. 300 chars) no body, em ambos os modos (`diagnóstico` e `simulador/monitor`).
- Injeta um bloco no `systemPrompt`:
  > `Contexto da marca: {geoContext}. Avalie/responda considerando esse recorte de atuação — relevância, exemplos e cobertura semântica devem ser ponderados para esse público.`
- Sem `geoContext` → comportamento atual inalterado (fallback nacional implícito).
- Callers a atualizar para passar `getGeoContext()` lendo `brand_settings` do usuário logado:
  - `src/pages/dashboard/SimuladorPage.tsx`
  - `src/pages/dashboard/PromptTesterPage.tsx`
  - `src/components/dashboard/llmstxt/DiagnosticoTab.tsx` (caso chame simulate-ai)
  - `src/pages/dashboard/AdminConvitesPage.tsx` (lê coverage do invite/cliente alvo se disponível, senão envia `undefined`)
  - `src/pages/PreviewPage.tsx` → continua mandando `undefined` (lead anônimo, sem brand_settings ainda).

### 2. `generate-content` (artigo + FAQ + resumo)

- Já valida JWT e lê `brand_settings` server-side. Expandir o `.select(...)` para incluir `coverage_type`, `coverage_city`, `coverage_state`, `coverage_region`.
- Reimplementar `getGeoContext()` inline (Deno não importa de `src/`).
- Injetar bloco `CONTEXTO GEOGRÁFICO` no `buildUserPrompt`, antes do tópico, com instrução: calibrar exemplos, referências locais e tom para o público do recorte declarado.
- Sem mudar formato de saída nem cota.

### 3. `diagnose-llms-txt`

- Aceita `geoContext?: string` no body.
- Adicionar nova checagem `regional_presence` que só roda quando `geoContext` indicar regional (regex case-insensitive de `coverage_city` e `coverage_state` no texto do llms.txt):
  - ambos presentes → `ok`
  - só um → `warning`
  - nenhum → `critical`
- Quando `geoContext` for nacional/ausente → check não aparece (não polui o relatório).
- Caller `DiagnosticoTab.tsx` passa `getGeoContext()` lendo `brand_settings`.

### Fora de escopo (Fase 3 / não fazer agora)

- `generate-llms-txt`, `monitor-llms-txt`
- Re-rodar análises antigas / migração de dados
- Mudanças de schema, RLS, score, pilares ou UI
- Mudanças no `PreviewPage` (lead ainda não tem brand_settings)

### Detalhes técnicos

- Helper de leitura no client: criar `src/hooks/useGeoContext.ts` que lê `brand_settings` do `user_id` atual via supabase client e retorna `string | undefined`. Evita duplicar a query nos 4 callers.
- Validação no edge: `geoContext` é string, `trim().slice(0, 300)`. Se vazio → tratar como ausente.
- Sem mudanças em `supabase/types.ts` (não há schema novo).
- Sem mudanças em `config.toml`.

### Arquivos tocados

Edge functions (3): `simulate-ai/index.ts`, `generate-content/index.ts`, `diagnose-llms-txt/index.ts`
Client (5): `useGeoContext.ts` (novo), `SimuladorPage.tsx`, `PromptTesterPage.tsx`, `DiagnosticoTab.tsx`, `AdminConvitesPage.tsx`
Memória: `mem://features/geo-context-injection` + atualizar `mem://index.md`
