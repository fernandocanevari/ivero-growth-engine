

## Plano: Score GEO dinâmico — 5 pilares × 5 IAs × 4 pontos

### Fórmula
- 5 pilares (Clareza, Autoridade, Conversão, Posicionamento, Relevância)
- Cada pilar é consultado nas 5 IAs com um prompt específico
- Cada menção da marca por uma IA em um pilar = **4 pontos**
- Score máximo = 5 pilares × 5 IAs × 4 = **100**
- Exemplo: se apenas 2 IAs mencionam a marca em cada pilar → 5 × 2 × 4 = **40**

### O que mudar

**1. Fazer 5 chamadas à edge function (uma por pilar)**

Cada pilar terá um prompt específico:
- **Clareza**: "Qual empresa de [setor] comunica melhor sua proposta de valor?"
- **Autoridade**: "Qual a empresa mais reconhecida/confiável em [setor]?"
- **Conversão**: "Qual empresa de [setor] você recomendaria para contratar?"
- **Posicionamento**: "Qual empresa se destaca no mercado de [setor]?"
- **Experiência**: "Qual empresa de [setor] oferece a melhor experiência ao cliente?"

As 5 chamadas rodam em paralelo (`Promise.all`).

**2. Calcular score por pilar e score geral**

Para cada pilar: contar quantas IAs mencionaram a marca → multiplicar por 4 → score do pilar (0-20).

Score GEO = soma dos 5 pilares (0-100).

**3. Atualizar `radarData` e `pillarDetails` dinamicamente**

- `radarData` → valor de cada pilar = (menções × 4) × 5 (escalar para 0-100 no radar)
- `pillarDetails` → score, status e textos ajustados conforme resultado real
- A frase de resumo (`getScoreLevel`) já funciona com score dinâmico

**4. Manter a seção "Presença nas IAs" como está**

Usar os resultados do pilar "Autoridade" (ou agregar todos) para a seção de engines.

### Arquivo modificado
- `src/pages/PreviewPage.tsx`

### Fluxo de loading
O loading atual de ~6 segundos se mantém — as 5 chamadas paralelas rodam dentro desse período. Se todas falharem, fallback para score 0 com mensagem apropriada.

### Limitação
ChatGPT, Gemini e Claude continuam sem créditos — score real virá de Perplexity e GPT-5. Máximo prático atual = 5 pilares × 2 IAs × 4 = **40 pontos**.

