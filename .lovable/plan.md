

## Plano: Integrar edge function na PreviewPage para análise real

### Problema
A PreviewPage exibe dados 100% estáticos (mock). Qualquer URL digitada gera o mesmo resultado.

### O que mudar

**1. Chamar a edge function `simulate-ai` na PreviewPage**
- Extrair o nome da marca a partir da URL (ex: `www.renata.com.br` → `"renata"`, `www.redegraal.com.br` → `"redegraal"`)
- Durante o loading, chamar `simulate-ai` com mode `"tester"` e um prompt genérico como `"Qual a melhor empresa de [setor]?"` ou `"O que você sabe sobre [brandName]?"`
- Usar os resultados reais para popular a seção "Presença nas IAs" (quais IAs mencionam a marca)

**2. Tornar dinâmica a seção de IAs**
- Substituir o array hardcoded `aiEngines` pelos resultados reais da edge function
- Mostrar os 5 modelos disponíveis (ChatGPT, Gemini, Claude, Perplexity, GPT-5) com status real

**3. Manter os pilares e scores como mock (por enquanto)**
- A análise de Clareza, Autoridade, Conversão etc. requer scraping real do site — isso é uma feature futura
- Os scores e recomendações continuam mock, mas a seção de IAs será real

### Arquivos modificados
- `src/pages/PreviewPage.tsx` — adicionar chamada à edge function, substituir `aiEngines` mock por dados reais

### Limitações
- ChatGPT, Gemini e Claude estão sem créditos — só Perplexity e GPT-5 (via gateway) retornarão resultados reais
- Os pilares (Clareza, Autoridade etc.) continuarão mock até implementarmos scraping real

