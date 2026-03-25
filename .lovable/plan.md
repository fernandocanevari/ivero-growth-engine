

## Plano: Adicionar modelo "GPT-5" via Lovable AI Gateway

### Contexto
Adicionar temporariamente um segundo modelo gratuito via Lovable AI Gateway chamado "GPT-5" para testes. Será removido quando as chaves reais (Claude, Gemini, OpenAI, Perplexity) estiverem configuradas.

### Alteração

**Arquivo**: `supabase/functions/simulate-ai/index.ts`

No bloco que verifica `lovableKey`, adicionar uma segunda entrada `configs.push()` com:
- **name**: `"GPT-5"`
- **url**: `https://ai.gateway.lovable.dev/v1/chat/completions`
- **model**: `openai/gpt-5-mini`
- **Headers e parseResponse**: idênticos ao modelo "Perplexity" existente

### Resultado
O Simulador e o Prompt Tester mostrarão 5 modelos: ChatGPT, Gemini, Claude, Perplexity e GPT-5. Os dois últimos usam o gateway gratuito. Deploy da edge function após a alteração.

### Arquivos modificados
- `supabase/functions/simulate-ai/index.ts`

