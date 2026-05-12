## Objetivo

Adicionar uma nova engine **"Gemini Search"** ao `simulate-ai` que chama o Gemini com a tool nativa `google_search` (Google Search Retrieval). O modelo responde com base em resultados reais da web, em tempo real, sem scraping — o mais próximo possível do comportamento do Google AI Overview, via API oficial.

## O que muda

### 1. Edge Function `supabase/functions/simulate-ai/index.ts`

- Em `getModelConfigs()`, adicionar nova entrada quando `Key_gemini` existe:
  - `name: "Gemini Search"`
  - `url`: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`
  - `parseResponse`: igual ao Gemini atual (`candidates[0].content.parts[0].text`)
- Em `callModel()`, criar um branch específico para `"Gemini Search"`:
  ```ts
  body = {
    contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUser query: ${userPrompt}` }] }],
    tools: [{ google_search: {} }],
    generationConfig: { maxOutputTokens: maxTokens },
  };
  ```
- Mesmo fluxo de erro/parse dos outros modelos. Sem mudanças em `extractKeywordCloud` (ele ignora erros e usa qualquer modelo válido).

### 2. `src/lib/ai-models-status.ts`

- `MODELS_ACTIVE`: `["OpenAI", "Gemini", "GPT-5", "Gemini Search"]`
- `TOTAL_MODELS`: 4
- `MODELS_IN_STANDBY`: continua `[]` (banner segue oculto)

### 3. Copy da landing (atualizar contagem de "3 IAs" → "4 IAs")

Arquivos a ajustar (mesmas frases já alteradas no último ciclo):
- `FeaturesSection.tsx`, `StepsSection.tsx`, `FAQSection.tsx`, `ProblemSection.tsx`, `Footer.tsx` (adicionar 4º ícone), `InvestSection.tsx`, `AjudaPage.tsx`, `access-control.ts`, `keyword-cloud.ts`, `mock-data.ts`

Mensagem nova nas explicações: **"ChatGPT, Gemini, GPT-5 e Gemini Search (com grounding em tempo real do Google)"**.

### 4. Sem mudanças em

- Schema do banco — `analysis_history.results_by_model` é JSONB, aceita o novo modelo automaticamente.
- Outras edge functions.
- Lógica de score / pilares.

## Observações técnicas

- O parâmetro correto na API v1beta do Gemini 2.0+ é `tools: [{ google_search: {} }]` (não `googleSearchRetrieval`, que era da 1.5).
- `gemini-2.5-flash` suporta grounding nativo. Caso a chave atual não tenha acesso, fallback para `gemini-2.0-flash` com a mesma sintaxe.
- O Gemini Search retorna `groundingMetadata` (citações + URLs) junto com o texto. Por enquanto **ignoramos** — só usamos o texto. Em iteração futura podemos exibir as fontes citadas no dashboard como diferencial.
- Custo: uso da tool de busca é cobrado à parte pelo Google (~$35/1k queries em Search Grounding). Para o MVP, controlar via cota mensal já existente.

## Pergunta antes de implementar

Quer que eu já capture e exiba as **fontes citadas** (`groundingMetadata.groundingChunks`) no dashboard como prova de evidência da resposta, ou deixa essa camada para uma próxima entrega e fica só com o texto agora?
