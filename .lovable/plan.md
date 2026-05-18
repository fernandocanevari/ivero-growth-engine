# Ativar grounding com Google Search em todos os Gemini

Alvo único: `supabase/functions/simulate-ai/index.ts`. Nenhuma mudança no client, nas tabelas ou na lógica de scoring/parse.

## Mudanças

### 1. Trocar modelo dos dois Gemini para `gemini-2.5-pro`
- `Gemini` (linha 38–44): `gemini-2.0-flash` → `gemini-2.5-pro`
- `Gemini Search` (linha 48–57): `gemini-2.5-flash` → `gemini-2.5-pro`

URL e campo `model` atualizados para `gemini-2.5-pro` em ambos.

### 2. Adicionar `tools: [{ google_search: {} }]` no Gemini base
Hoje só o "Gemini Search" envia a tool (linha 253–262). Vou replicar o mesmo bloco para o `Gemini` base no branch `if (config.name === "Gemini")` (linha 246–252), incluindo modo `diagnostico`. O prompt e `generationConfig.maxOutputTokens` ficam iguais.

Observação técnica: a API v1beta do Gemini 2.x usa `tools: [{ google_search: {} }]` — o nome antigo `google_search_retrieval` é da família 1.5. Como o pedido é "ativar grounding", uso a forma correta para 2.5-pro (mantém compatibilidade com o que já existe no "Gemini Search").

### 3. Capturar `groundingMetadata` também para o Gemini base
Bloco de extração de citações (linha 318–331) hoje só roda quando `config.name === "Gemini Search"`. Vou estender para rodar quando `config.name === "Gemini" || config.name === "Gemini Search"`, preservando a mesma estrutura `{title, uri}` (máx. 8). Sem mudanças no shape de retorno — `citations` já é passado adiante em `simulator` e `tester`.

### 4. Diagnóstico
Mantém o pipeline atual (parse JSON dos pilares). A tool `google_search` é compatível com `generationConfig` e não interfere com a saída JSON — o modelo continua retornando o JSON dos pilares; só passa a fundamentar internamente com busca web. Sem mudanças no parser nem no `extractKeywordCloud`.

## Fora de escopo
- Sem mexer no front (SimuladorPage, PromptTester, DiagnosticoPage).
- Sem mudar `verify_jwt`, schema do DB ou outras edge functions.
- Sem trocar `gemini-2.5-pro` por `1.5-pro` (a sintaxe `google_search_retrieval` seria necessária e isso muda a API — fora do que foi pedido).

## Riscos
- `gemini-2.5-pro` é mais lento e caro que `flash`; as 2 chamadas Gemini agora rodam no Pro, dobrando custo Gemini por análise.
- Quota da Key_gemini precisa cobrir Pro + grounding (Google cobra à parte por consulta groundada acima do free tier).
