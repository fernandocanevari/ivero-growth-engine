# Atualizar IAs monitoradas: de 5 para 3 modelos ativos

## Contexto
O MVP da Ivero vai operar com 3 IAs ativas (OpenAI/ChatGPT, Gemini, GPT-5) em vez de 5. Claude e Perplexity saem do standby e não aparecem na interface. O banner de modelos em implementação deve desaparecer automaticamente.

## Mudancas

### 1. Fonte unica de verdade dos modelos
- `src/lib/ai-models-status.ts`
  - Esvaziar `MODELS_IN_STANDBY` (remover Claude e Perplexity)
  - Manter `MODELS_ACTIVE`: ["OpenAI", "Gemini", "GPT-5"]
  - `TOTAL_MODELS` = 3
  - Efeito: banner `ModelsStatusBanner` desaparece automaticamente (condicao `MODELS_IN_STANDBY.length === 0`)

### 2. Landing page

- `src/components/landing/FeaturesSection.tsx`
  - Card "Monitoramento Multi-IA": trocar descricao de "ChatGPT, Gemini, Perplexity, Claude e outros" para "ChatGPT, Gemini e GPT-5"

- `src/components/landing/StepsSection.tsx`
  - Passo 01: trocar "ChatGPT, Gemini, Perplexity e outras" para "ChatGPT, Gemini e GPT-5"

- `src/components/landing/ProblemSection.tsx`
  - Card 1: trocar "ChatGPT, Gemini ou Perplexity" para "ChatGPT e Gemini"

- `src/components/landing/FAQSection.tsx`
  - Pergunta "Quais IAs monitora?": remover "Claude (Anthropic), Perplexity" da resposta

- `src/components/landing/Footer.tsx`
  - NeuralNetwork: substituir os 7 icons de IA por apenas 3 (ChatGPT, Gemini, GPT-5)

- `src/components/landing/InvestSection.tsx`
  - Cards de planos: ajustar metricas "IAs monitoradas" para refletir 3 modelos (Presenca: 2 -> 2; Influencia: 3 -> 3; Autoridade: 4 -> 3; Dominio: 5 -> 3)

### 3. PreviewPage (diagnostico publico)

- `src/pages/PreviewPage.tsx`
  - `defaultAiEngines`: reduzir de 5 para 3 (ChatGPT, Gemini, GPT-5)
  - `iveroFeatures`: descricao do Monitoramento Multi-IA
  - Dialog de auditoria: ajustar texto "ChatGPT, Gemini, Claude e Perplexity"
  - Fallback engines (em `finally`): reduzir de 5 para 3 entradas

### 4. Dashboard / Ajuda

- `src/pages/dashboard/AjudaPage.tsx`
  - FAQ "Como interpretar o Score": remover "Claude, Perplexity" da lista de IAs

### 5. Libs de suporte

- `src/lib/access-control.ts`
  - Descricoes dos recursos premium: ajustar "5 modelos" para "3 modelos" e remover Claude/Perplexity das copys

- `src/lib/keyword-cloud.ts`
  - Comentario: ajustar "5 modelos" para "3 modelos"

- `src/lib/mock-data.ts`
  - Todos os dados mockados: remover entradas Claude e Perplexity, reduzir arrays de 5 para 3 modelos

## Technical details
- Nenhuma mudanca no schema do banco.
- Nenhuma mudanca na edge function `simulate-ai` (ela ja lida com modelos ativos dinamicamente).
- Os dados historicos em `analysis_history` com 5 modelos permanecem validos (nao ha migracao).
