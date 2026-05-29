# Remover banner + atualizar modelo Gemini

## 1. Remover o `ModelsStatusBanner` do dashboard

**Arquivo:** `src/components/dashboard/DashboardLayout.tsx`
- Remover o import `ModelsStatusBanner` (linha 8).
- Remover o `<ModelsStatusBanner />` (linha 78).

**Arquivo:** `src/components/dashboard/ModelsStatusBanner.tsx`
- Deletar (não há outros usos).

**Arquivo:** `src/lib/ai-models-status.ts`
- Deletar (só era consumido pelo banner).

Nenhum outro componente, rota ou lógica é alterado.

## 2. Atualizar Gemini 2.0 Flash → Gemini 2.5 Flash (estável)

O Google está depreciando `gemini-2.0-flash` em 01/jun/2026. A versão estável atualmente recomendada que mantém suporte a Google Search Grounding via `tools: [{ google_search: {} }]` é **`gemini-2.5-flash`**.

**Arquivo:** `supabase/functions/simulate-ai/index.ts`
- Linhas 47–48 (config `Gemini`): trocar `gemini-2.0-flash` → `gemini-2.5-flash` no `url` e no `model`.
- Linhas 55–56 (config `Google Modo IA`): mesma troca.
- Linha 250 (comentário): atualizar referência "gemini-2.0-flash" → "gemini-2.5-flash".

A lógica de grounding (linha 252–257) continua igual: só `Google Modo IA` injeta `tools: [{ google_search: {} }]`. Garantido que o Google Search Grounding permanece ativo no novo modelo (2.5-flash suporta a mesma `tools.google_search` na v1beta).

**Arquivo:** `src/pages/dashboard/ConfiguracoesPage.tsx`
- Linha 21: atualizar string descritiva `"Google Gemini 2.0 Flash"` → `"Google Gemini 2.5 Flash"` (apenas texto exibido na UI; sem mudança estrutural).

## Fora de escopo
- Nenhuma alteração em `generate-content`, `diagnose-llms-txt`, `simulate-ai` além das trocas de modelo, prompts, pillars, score, RLS, schema, rotas ou outros componentes.
- Nenhuma mudança no fluxo de injeção de contexto regional já implementado.
