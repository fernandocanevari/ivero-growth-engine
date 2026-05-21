## Objetivo

Ativar o slot **"Google Modo IA"** com **Gemini 2.0 Flash + Google Search Grounding real** — modelo rápido e barato, com busca em tempo real na web para mapear menções, PR e presença digital das marcas com dados atualizados.

## Estado atual (após inspeção do código)

`supabase/functions/simulate-ai/index.ts` hoje:

| Slot | Modelo atual | Grounding |
|---|---|---|
| Gemini | `gemini-2.5-pro` | ✅ já ativo (`tools: [{ google_search: {} }]`) |
| Google Modo IA | `gemini-2.5-pro` | ✅ já ativo (mesmo modelo, mesma config) |

Ou seja: o grounding **já está ligado nos dois**, mas eles são **idênticos** (mesmo modelo Pro, lento e caro). O que falta é diferenciar: deixar o slot "Google Modo IA" usar **Flash** (rápido/barato) e o "Gemini" continuar como modelo puro de referência.

## Mudanças

Arquivo único: `supabase/functions/simulate-ai/index.ts`

### 1. Diferenciar os dois slots Gemini (linhas 37–59)

- **"Gemini"** → continua `gemini-2.5-pro`, **remover** o grounding (vira "memória do modelo puro", sem busca web). Serve como baseline do que o modelo já sabe da marca via treinamento.
- **"Google Modo IA"** → trocar para **`gemini-2.0-flash`**, manter grounding ativo. Será o slot que busca a web em tempo real para PR/menções/presença digital.

Mudar `url` e `model` de cada config para apontar para os endpoints corretos:
- Gemini: `v1beta/models/gemini-2.5-pro:generateContent`
- Google Modo IA: `v1beta/models/gemini-2.0-flash:generateContent`

### 2. Aplicar `google_search` apenas no slot certo (linhas 247–255)

Hoje o bloco `if (config.name === "Gemini" || config.name === "Google Modo IA")` aplica grounding nos dois. Trocar a condição: só inclui `tools: [{ google_search: {} }]` quando `config.name === "Google Modo IA"`. O slot "Gemini" envia o mesmo body **sem** a chave `tools`.

### 3. Parser de citações (linhas 327–339)

Manter a extração de `groundingMetadata.groundingChunks[]` apenas para o slot **"Google Modo IA"** (o único que agora retorna grounding). O slot "Gemini" passa a devolver `citations: []` naturalmente.

### 4. Atualizar comentários

Linha 38 e linha 248: refletir a nova realidade — "Gemini puro (sem grounding)" vs "Google Modo IA (Flash + Google Search)".

### 5. Sem mudanças no front

`SimuladorPage.tsx` já trata `citations` corretamente, já tem o card especial para "Google Modo IA" (incluindo retry quando vem vazio) e já mostra o badge "Grounding em tempo real". Nada a mexer.

## Por que Gemini 2.0 Flash (e não 2.5 Flash)

- Pedido explícito do usuário.
- `gemini-2.0-flash` aceita a tool `google_search` nativa em `v1beta` (mesma API que o slot já usa).
- ~10x mais barato que 2.5-pro no input (~$0.10 vs $1.25 / 1M tokens) e ~25x mais barato no output (~$0.40 vs $10 / 1M).
- Latência baixa o suficiente para o Simulador rodar os 4 slots em paralelo sem o Google Modo IA virar gargalo.

## Validação

1. Abrir `/dashboard/simulador`, perguntar "Quais as melhores agências de marketing de SP?".
2. Confirmar nos 4 cards:
   - **ChatGPT** e **Gemini**: resposta de treinamento, sem fontes.
   - **Google Modo IA**: resposta + bloco "Fontes citadas (N)" com domínios reais, favicons e badge "Grounding em tempo real".
   - **GPT-5**: como hoje.
3. Verificar logs de `simulate-ai` no Supabase — status 200, sem warning de "Resposta inválida" para o slot Flash.
4. Rodar um Diagnóstico completo no Preview e confirmar que os 5 pilares continuam vindo dos 4 modelos sem regressão (o Diagnóstico não muda — continua usando o mesmo `callModel` para os dois slots Gemini, agora com modelos diferentes).

## Memória a atualizar

`mem://technical/ai-integration-multi-model`: refletir
- Slot "Gemini" → `gemini-2.5-pro`, sem grounding (baseline de memória do modelo).
- Slot "Google Modo IA" → `gemini-2.0-flash` + `google_search` grounding (busca web em tempo real, foco em custo/velocidade).

## Fora de escopo

- Não mexer em ChatGPT, Claude, GPT-5, Perplexity.
- Não mexer em `generate-content`.
- Não mudar prompts do Diagnóstico nem UI do Simulador.
- Não persistir as URLs do grounding no banco (continua só em memória da resposta).
