

## Plano: Atualizar Edge Function `simulate-ai` com Prompt do Radar Estratégico IVERO

### Contexto

Atualmente a edge function `simulate-ai` usa um prompt genérico simples ("Answer the user's question naturally..."). O objetivo é adicionar um novo modo `"diagnostico"` que use o prompt completo do Radar Estratégico IVERO com os 5 pilares, retornando JSON estruturado com scores e justificativas.

### O que será feito

#### 1. Atualizar `supabase/functions/simulate-ai/index.ts`

- **Novo modo `"diagnostico"`**: Quando `mode === "diagnostico"`, usar o prompt completo do Radar Estratégico em vez do prompt genérico
- **System prompt dedicado**: Incluir os critérios detalhados de cada pilar (Clareza, Autoridade, Posicionamento, Conversão, Relevância) com o formato JSON de resposta esperado
- **Aumentar `max_tokens`** para ~1000 no modo diagnóstico (o JSON estruturado precisa de mais espaço)
- **Parsear a resposta**: Extrair o JSON dos 5 pilares da resposta da IA e retorná-lo junto com o `model` name
- Os modos existentes (`simulator`, `tester`) continuam funcionando exatamente como antes

#### 2. Atualizar `src/pages/PreviewPage.tsx`

- Alterar as chamadas para usar `mode: "diagnostico"` em vez de `"tester"` com prompts individuais por pilar
- Em vez de 5 chamadas paralelas (uma por pilar), fazer **1 chamada por modelo** que retorna todos os 5 pilares de uma vez
- Parsear o JSON estruturado retornado para popular o radar e os pillar details com scores reais (0-100) e justificativas da IA
- Calcular o score geral como média dos 5 pilares

### Detalhes técnicos

**Prompt do sistema (modo diagnóstico):**
Será o prompt completo "SISTEMA — RADAR ESTRATÉGICO IVERO" fornecido pelo usuário, incluindo a pergunta-guia, os 5 blocos de análise com critérios específicos, e o formato JSON de resposta.

**Fluxo de dados:**
```text
Client (PreviewPage)
  → invoke("simulate-ai", { prompt: siteContent, brandName, mode: "diagnostico" })
  → Edge Function usa prompt IVERO completo
  → Cada modelo retorna JSON com 5 pilares { clareza, autoridade, posicionamento, conversao, relevancia }
  → Client recebe scores + justificativas por modelo
  → Calcula média entre modelos para score final de cada pilar
```

**Estrutura de resposta do modo diagnóstico:**
```json
{
  "results": [
    {
      "model": "ChatGPT",
      "pillars": {
        "clareza": { "score": 75, "justificativa": "..." },
        "autoridade": { "score": 40, "justificativa": "..." },
        "posicionamento": { "score": 60, "justificativa": "..." },
        "conversao": { "score": 55, "justificativa": "..." },
        "relevancia": { "score": 70, "justificativa": "..." }
      }
    }
  ]
}
```

### Arquivos modificados

1. `supabase/functions/simulate-ai/index.ts` — novo prompt e lógica para modo diagnóstico
2. `src/pages/PreviewPage.tsx` — adaptar chamada e parsing para usar modo diagnóstico

