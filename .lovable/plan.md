

## Raciocínio de Score do Radar Estratégico

### Contexto

Hoje cada pilar recebe um score 0–100 direto da IA, sem mostrar *como* o número foi formado. Isso fragiliza a defesa do score perante o cliente executivo e dificulta gerar ações de melhoria concretas.

### Proposta: 3 sub-critérios ponderados por pilar

Cada pilar passa a ser decomposto em **3 sub-critérios objetivos** (já presentes nos prompts atuais), cada um com score 0–100 e peso. O score final do pilar é a média ponderada — calculada pela própria IA.

| Pilar | Critério 1 (40%) | Critério 2 (35%) | Critério 3 (25%) |
|---|---|---|---|
| **Clareza** | Proposta de valor no hero | Compreensão em <5s | Linguagem livre de jargão |
| **Autoridade** | Provas sociais (cases, números) | Expertise técnica/conteúdo | Prêmios e certificações |
| **Posicionamento** | Nicho e público-alvo definidos | Diferencial competitivo | Consistência de mensagem |
| **Conversão** | CTAs claros e visíveis | Oferta/próximo passo | Fluxo de navegação lógico |
| **Relevância** | Termos do nicho (35%) | Responde perguntas reais (35%) | Cobertura semântica (30%) |

### Faixas de interpretação (universal)

| Score | Faixa | Significado |
|---|---|---|
| 0–39 | **Crítico** | Sinal ausente — IA não infere |
| 40–59 | **Insuficiente** | Sinal inconsistente — IA hesita |
| 60–79 | **Sólido** | Sinal claro — IA considera |
| 80–100 | **Referência** | Sinal forte — IA cita com confiança |

### O que será implementado

**1. Edge Function `simulate-ai` (modo `diagnostico`)**
Atualizar `DIAGNOSTICO_SYSTEM_PROMPT` para retornar, por pilar:
- `score` final (média ponderada calculada pela IA)
- `criterios`: array de 3 objetos `{ nome, score, peso, justificativa }`
- `justificativa` síntese (já existe)

```json
{
  "clareza": {
    "score": 72,
    "justificativa": "Proposta clara mas com jargão técnico.",
    "criterios": [
      { "nome": "Proposta de valor no hero", "score": 85, "peso": 40, "justificativa": "..." },
      { "nome": "Compreensão em <5s", "score": 75, "peso": 35, "justificativa": "..." },
      { "nome": "Linguagem livre de jargão", "score": 50, "peso": 25, "justificativa": "..." }
    ]
  }
}
```

**2. `PreviewPage.tsx`**
- Score do pilar = média entre modelos
- Salvar `criterios` no `pillarDetails` para uso no dashboard
- Score geral = média dos 5 pilares (mantém)

**3. `DiagnosticoPage.tsx`**
Adicionar um bloco discreto **"Como chegamos a esse score"** em cada card de pilar, abaixo da Definição e antes de Análise/Impacto. Visual com 3 mini-barras horizontais:

```text
Proposta de valor no hero    ████████░░  85   (40%)
Compreensão em <5s           ███████░░░  75   (35%)
Linguagem livre de jargão    █████░░░░░  50   (25%)
```

Mais um **badge de faixa** (Crítico/Insuficiente/Sólido/Referência) ao lado do score do pilar — cor tênue para não competir com Análise e Impacto Competitivo.

### Arquivos modificados

1. `supabase/functions/simulate-ai/index.ts` — novo prompt com rubrica e formato JSON estendido
2. `src/pages/PreviewPage.tsx` — armazenar `criterios` em `pillarDetails`
3. `src/pages/dashboard/DiagnosticoPage.tsx` — bloco de critérios + badge de faixa

