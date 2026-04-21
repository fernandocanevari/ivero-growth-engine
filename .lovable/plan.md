

## Reposicionar a barra de progresso nos cards de pilar (PreviewPage)

### Situação atual

Em `src/pages/PreviewPage.tsx` (linhas 1057-1103), cada card de pilar tem:

```text
┌─────────────────────────────────────────────────────────┐
│ [icon] Clareza                  [INSUFICIENTE] 44 /100  │
│        Sua comunicação...                               │
├─────────────────────────────────────────────────────────┤
│ ████████████░░░░░░░░░░░░░░░░░░░  ← barra largura total  │
└─────────────────────────────────────────────────────────┘
```

A barra vermelha "estoura" visualmente porque ocupa toda a largura, distante do score que ela representa.

### Mudança proposta

Mover a barra para **dentro do bloco da direita, logo abaixo do "44 /100"**, com largura compacta (~140px) — ela passa a ser uma extensão visual do score:

```text
┌─────────────────────────────────────────────────────────┐
│ [icon] Clareza                  [INSUFICIENTE] 44 /100  │
│        Sua comunicação...       ████████░░░░░░░░░       │
├─────────────────────────────────────────────────────────┤
│ ANÁLISE DETECTADA                                       │
│ ✓ Headline objetiva...                                  │
└─────────────────────────────────────────────────────────┘
```

Vantagens:
- A barra fica visualmente atrelada ao número que ela representa.
- O card fica mais limpo, sem aquele "traço vermelho" cortando o card no meio.
- Acompanha o padrão do score circular geral (onde a visualização fica grudada no número).

### Alterações técnicas

Arquivo único: `src/pages/PreviewPage.tsx`.

1. **Remover** o bloco `<div className="h-2.5 rounded-full bg-muted overflow-hidden">…</div>` das linhas 1095-1103 (barra full-width atual).

2. **Inserir** a mesma barra dentro do bloco da direita (linhas 1071-1092), logo após o `<div className="flex items-baseline gap-2">…</div>` que contém badge + score, com:
   - Largura fixa: `w-36` (~144px) para alinhar com o tamanho do score.
   - Altura: mantém `h-2` (ligeiramente menor que os 2.5 atuais para combinar com o contexto compacto).
   - Mesma cor dinâmica (`barColor`) e mesma animação `motion.div` com `whileInView`.

3. **Manter intactos**: `getScoreBand`, `scoreColor`, `barColor`, badge, animação, ordem dos demais elementos do card (Análise detectada, recomendação, etc.).

### Comportamento responsivo

No mobile (< 640px), o bloco da direita já quebra abaixo do título por causa do `flex items-start justify-between gap-4`. A barra de 144px continua cabendo confortavelmente nessa coluna estreita — não exige media query nova.

### Fora do escopo

- Não toca em `DiagnosticoPage.tsx` nem `PilaresPage.tsx` (dashboard) — a pedido refere-se à PreviewPage (lead magnet) onde aparece o screenshot.
- Não muda cores, thresholds (`getScoreBand`), nem a lógica do `barColor`.
- Não mexe no card geral do "Score de Presença GEO" (linhas 416-419) — só nos cards de pilar individuais.

