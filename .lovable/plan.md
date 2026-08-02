## 1. Viabilidade dos dados (o que já existe hoje)

Verifiquei `src/pages/PreviewPage.tsx` e `supabase/functions/simulate-ai/index.ts`. A chamada é única por modelo (`mode: "diagnostico"`) e já retorna tudo o que é necessário. **Nenhuma chamada adicional à IA é necessária.**

| Seção | Origem hoje | Status |
|---|---|---|
| Pilares detalhados | `dynamicPillarDetails` (score real por pilar + `criterios[]` com `nome`, `peso` e `justificativa` **reais da IA**). O `summary`/`strengths`/`weaknesses` são textos-template escolhidos pela faixa de score (`buildPillarDetails`) | Dados reais disponíveis. O único texto verdadeiramente "gerado pra essa marca" é `criterios[].justificativa` — é o que deve ir na amostra |
| Diagnóstico final | Montado no cliente a partir de `geoScore` + os 2 pilares mais fracos (template por faixa) | Disponível, mas hoje é template. Para a amostra ficar "real", proponho usar a `justificativa` do pilar mais fraco como primeira frase e manter o template como fechamento |
| Plano de ação | **100% hardcoded** — array fixo de 5 itens genéricos, sempre borrado, igual para toda marca | Aqui há lacuna real: não existe ação personalizada. Ver item 3 abaixo |

Observação importante: hoje as `criterios[].justificativa` da IA não são exibidas em lugar nenhum da PreviewPage (há um comentário "reserved for the executive dashboard"). Ou seja, existe conteúdo real e inédito disponível de graça para usar nas amostras — sem custo extra de tokens.

## 2. Como aplicar o "borrado parcial"

Reaproveitando o que já existe, com um componente novo pequeno:

- `SoftBlur` (blur 1.5px + CTA no hover) — bom para blocos inteiros, mas fraco para "meia frase".
- `BlurredOverlay` (overlay backdrop-blur sobre o conteúdo) — bom para o radar, já em uso.
- **Novo `PartialReveal`** (~20 linhas, mesma linguagem visual): recebe o texto real e uma proporção (`revealRatio`, ex. 0.45). Renderiza o primeiro trecho nítido e o restante com `blur-[4px] select-none pointer-events-none` + `aria-hidden`, terminando com um fade `mask-image` para a direita, para o corte não parecer truncamento e sim conteúdo bloqueado. O corte é feito por palavra (não por caractere) para não cortar no meio de uma palavra.

Regras aplicadas:
- Nenhum número (score de pilar, peso de critério) aparece nas amostras — só texto.
- Conteúdo borrado com `userSelect: none`, `onCopy` bloqueado e `onContextMenu` bloqueado, igual ao bloco de plano de ação atual (evita copiar o texto via seleção).
- Cada amostra ganha um selo discreto "Amostra — 1 de 5" / "Prévia parcial" e um link "Ver completo" que rola até o formulário no final (`scrollIntoView`).

## 3. Critérios de seleção da amostra

- **Pilar detalhado (item 3):** o pilar com **menor score entre os que têm `hasData === true`**. Exibe nome + ícone + `summary` nítido, e a `justificativa` do critério de maior peso desse pilar em `PartialReveal` (45% nítido). Score, faixa e barra ficam ocultos.
- **Diagnóstico final (item 4):** primeiro parágrafo do diagnóstico (o que depende da faixa de `geoScore`) com `PartialReveal` a ~50%. O segundo parágrafo (que nomeia os 2 pilares mais fracos) fica de fora do teaser, já que os nomes dos 2 mais fracos já são revelados no radar (Prompt B).
- **Plano de ação (item 5):** como não existe plano personalizado, proponho um mapa determinístico `pilar → ação prioritária` (5 entradas, reaproveitando os textos `recBad`/`recGood` que já existem em `buildPillarDetails`). A amostra mostra a ação do **pilar mais fraco**, numerada como "1 de 5", com título nítido e descrição em `PartialReveal` (40%). Sem inventar prazos, responsáveis ou métricas.
  - Alternativa, se preferir: manter o array atual mas selecionar qual dos 5 itens mostrar pelo pilar mais fraco. Menos personalizado, mudança menor. Minha recomendação é o mapa determinístico.
- Se nenhum pilar tiver dados (`hasData` falso em todos), as três amostras não são renderizadas — o formulário aparece direto, sem placeholder fabricado (consistente com a correção do score fabricado).

## 4. Auto-unlock (usuário vindo do Hero)

Confirmado e sem risco. O gate já é controlado por um único estado: `leadSubmitted`, inicializado com `cameIdentifiedFromHero` (name válido + email válido nos search params). Mover o formulário para o final não altera essa lógica — o formulário e todas as amostras ficam sob `{!leadSubmitted && ...}`, e o conteúdo completo sob `{leadSubmitted && ...}`.

Portanto: **sim, quem chega identificado via URL vê tudo liberado direto, sem nenhum teaser, blur ou formulário** — a página fica idêntica ao estado pós-desbloqueio de hoje. Nenhuma mudança nos campos do formulário, no schema de validação, no `handleLeadSubmit` ou na gravação do lead.

## 5. Layout final proposto (ordem do topo)

```text
1. Score geral + presença nas 3 IAs + contador fortes/críticos   [livre]
2. Radar Estratégico em teaser (2 pilares mais fracos nomeados nos eixos)
3. Amostra "5 pilares detalhados"  — 1 pilar (mais fraco), texto parcial
4. Amostra "Diagnóstico final"     — 1º parágrafo, texto parcial
5. Amostra "Plano de ação"         — ação 1 de 5, descrição parcial
6. FORMULÁRIO (gate)               — nome / e-mail / site / celular
7. [pós-desbloqueio] radar completo, 5 pilares, diagnóstico, plano, CTAs
```

O card sticky do formulário atual passa a ser um bloco normal (não sticky) no fim da sequência de teasers; para não perder conversão de quem lê rápido, sugiro uma barra fina fixa no rodapé mobile com "Desbloquear análise completa" que rola até o formulário — dizer se quer isso incluído.

## 6. Escopo técnico da implementação (quando aprovado)

- Arquivo único: `src/pages/PreviewPage.tsx` (reordenação de blocos + novo componente `PartialReveal` local + mapa `pilar → ação`).
- Nenhuma mudança em `simulate-ai`, no schema do lead, na gravação de lead/proposta, no `scoreForRecords`, nem no corte validado (score + presença livres).
- Validação por Playwright em 3 cenários: visitante anônimo (3 amostras + formulário no final), visitante identificado via URL (zero blur), e análise sem dados de pilar (amostras ausentes).
