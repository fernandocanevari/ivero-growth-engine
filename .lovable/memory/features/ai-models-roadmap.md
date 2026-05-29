---
name: AI Models Roadmap
description: MVP roda com ChatGPT, Gemini e Google Modo IA. Claude, Perplexity, GPT-5, Copilot e OpenAI Azure no roadmap.
type: feature
---

## Ativos no MVP (3 modelos reais, chamados em paralelo pela edge `simulate-ai`)
- **ChatGPT** — OpenAI `gpt-4o-mini` via secret `key_Open_IA`
- **Gemini** — Google `gemini-2.5-flash-lite` via secret `Key_gemini`
- **Google Modo IA** — Google `gemini-2.5-flash-lite` com `googleSearch` grounding, mesma chave `Key_gemini`

## Roadmap (badges cinza "Em breve")
- **Claude** (Anthropic) — código já existe em `simulate-ai/index.ts` (bloco desativado). Secret `Key_antropic_claude` configurada mas SEM créditos na conta Anthropic. Para reativar: recarregar créditos em console.anthropic.com/settings/billing e descomentar o bloco `if (claudeKey) { configs.push(...) }` removido em 29/mai/2026.
- **Perplexity** — precisa `PERPLEXITY_API_KEY` + endpoint `api.perplexity.ai` modelo `sonar`
- **GPT-5** — aguardar disponibilidade ampla
- **Copilot / OpenAI Azure** — sem ETA

## Copy padronizada
Sempre usar "ChatGPT, Gemini e Google Modo IA" (3 modelos) em copy de landing, FAQ, ajuda e access-control. Nunca prometer Claude como ativo enquanto a conta Anthropic estiver sem créditos.
