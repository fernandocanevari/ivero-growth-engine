## Objetivo

Trocar o modelo OpenAI usado no **Simulador** (coluna "ChatGPT") de `gpt-5-mini` para `gpt-4o-mini`, mantendo `gpt-5-mini` no modo Diagnóstico (onde o raciocínio agrega valor real).

## Por que

- `gpt-4o-mini` não é um modelo de reasoning → não consome tokens com "pensamento interno"
- ~60% mais barato por token
- Latência menor (resposta imediata, sem fase de thinking)
- Qualidade praticamente idêntica para perguntas curtas estilo "qual a melhor ferramenta de X?"
- Elimina a necessidade dos parâmetros `reasoning_effort` e do budget inflado de tokens

## Mudanças

Arquivo único: `supabase/functions/simulate-ai/index.ts`

1. **Bloco da chamada OpenAI no modo Simulador** (linhas ~263-272):
   - Trocar `model: "gpt-5-mini"` por `model: "gpt-4o-mini"`
   - Remover o parâmetro `reasoning_effort: "minimal"` (não se aplica a modelos não-reasoning)
   - Reduzir `max_completion_tokens` de 1200 de volta para ~400 (suficiente sem o overhead de reasoning)
   - Trocar `max_completion_tokens` por `max_tokens` (parâmetro correto para gpt-4o family)

2. **Bloco da chamada OpenAI no modo Diagnóstico**: **não mexer**. Continua com `gpt-5-mini` + `reasoning_effort: "medium"` + 4000 tokens.

3. **Label exibida ao usuário**: continua como "ChatGPT" (não precisa mencionar versão).

## Validação

- Rodar uma pergunta no Simulador ("Qual a melhor ferramenta de SEO?") e confirmar que ChatGPT responde rápido e com texto não-vazio
- Verificar logs do edge function `simulate-ai` — status 200, sem warnings de empty content
- Confirmar que Gemini, Gemini Search e Lovable AI continuam funcionando em paralelo (não foram tocados)

## Memória a atualizar

Atualizar `mem://technical/ai-integration-multi-model` para refletir que o Simulador usa `gpt-4o-mini` (rápido/barato) e o Diagnóstico usa `gpt-5-mini` (reasoning).

## Fora de escopo

- Não alterar o modelo do Diagnóstico
- Não alterar Gemini, Gemini Search ou Lovable AI Gateway
- Não mexer no `generate-content` (gerador de conteúdo GEO)
- Não tratar o erro 402 do GPT-5 via Lovable Gateway (depende de créditos no workspace)
