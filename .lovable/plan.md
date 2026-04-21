

## Manter as 5 faixas, simplificar exibição

Você tem razão — a rubrica oficial do Diagnóstico (definida em `mem://features/preview/score-rubric`) usa **5 faixas**, não 3. Vou manter essa estrutura e só limpar a duplicação visual no card.

### Faixas oficiais (mantidas)

- **Crítico** — 0–39
- **Insuficiente** — 40–59
- **Moderado** — 60–74
- **Sólido** — 75–89
- **Referência** — 90–100

### O que muda no card do `/dashboard/diagnostico`

Hoje o card mostra **dois rótulos** ao lado do score:
- badge maiúsculo da faixa (`REFERÊNCIA`)
- pill de status textual (`Forte`)

Vou remover a pill de status redundante e manter **apenas a badge da faixa**, que já comunica a classificação com cor semântica.

### Layout final

```text
Clareza (Entendimento)                          82 /100
Sua marca comunica de forma direta...         [ Sólido ]
```

- Score em destaque no topo direito.
- Uma única badge abaixo com o nome da faixa (`Crítico` / `Insuficiente` / `Moderado` / `Sólido` / `Referência`), pintada com a cor correspondente:
  - Crítico → vermelho
  - Insuficiente → laranja
  - Moderado → amarelo
  - Sólido → verde-claro
  - Referência → verde-escuro / esmeralda

### Arquivos afetados

- `src/pages/dashboard/DiagnosticoPage.tsx` — remover a segunda pill (`Forte`/`Moderado`/etc), manter só a badge da faixa.
- Verificar `ScorePage` e `PilaresPage` para aplicar o mesmo enxugamento se exibirem a mesma duplicação.
- Rubrica em si (`PreviewPage`, score-rubric) **não muda** — as 5 faixas continuam intactas no cálculo e no storytelling.

### Fora do escopo

- Mudar fórmula ou faixas de cálculo.
- Mexer em Radar Estratégico, tags de percepção ou nuvem de palavras.

