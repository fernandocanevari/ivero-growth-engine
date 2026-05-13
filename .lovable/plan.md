## Diagnóstico

O bloco atual ficou pesado porque empilha **duas caixas** seguidas (métricas com borda+fundo accent/3 e logo abaixo outra caixa com borda lateral grossa + fundo gradiente). Isso quebra o ritmo do card, cria visual de "alerta" e destoa do design system limpo da Ivero.

## Nova abordagem — minimal e tipográfica

Manter a comunicação ("tudo do plano anterior + estes exclusivos") sem adicionar uma segunda caixa. Usar tipografia, hierarquia e separadores — o mesmo idioma visual que já existe no card (texto + ✦, gradient line, accent color).

### Estrutura proposta para o bloco de diferenciais

```
─────────────────────────────────  (linha gradiente sutil, separa das métricas)

TUDO DO PRESENÇA  +  EXCLUSIVOS DESTE PLANO    (chip de texto, sem caixa)

✦  Análise de Sentimento                (texto limpo, peso semibold)
✦  Análise Comparativa com concorrentes
```

### Detalhes visuais

- **Separador superior**: linha de 1px com gradiente `from-ivero-purple/30 via-ivero-purple/10 to-transparent` (ou accent no card destacado), igual ao já usado no header do plano. Cria a transição sem peso.
- **Chip de inheritance** (substitui a caixa pesada): apenas texto uppercase pequeno, ex.:
  - Presença: `Diferenciais inclusos`
  - Influência: `Tudo do Presença · + exclusivos`
  - Autoridade: `Tudo do Influência · + exclusivos`
  - Cor accent/ivero-purple, font-bold, tracking-wider, sem fundo nem borda.
  - A palavra "+ exclusivos" recebe peso visual leve (gradient text ou color cheia).
- **Lista de diferenciais**: voltar ao ✦ original (consistente com o resto da landing), mas com texto em `text-foreground font-semibold` para ganhar peso vs. a versão anterior. Sem caixa, sem fundo.
- **Espaçamento**: `pt-4 mt-4 border-t-0` (a linha gradiente faz o papel da borda).
- **Alinhamento da base**: usar `min-h-[110px] sm:min-h-[120px]` apenas no `<ul>` para garantir que os 3 CTAs alinhem.

### Por que fica coerente com a Ivero

- Não introduz componente novo nem cor nova.
- Mantém a "linguagem ✦ + texto" já presente em outros blocos.
- Aproveita a linha gradiente que já é assinatura visual dos cards.
- Respeita o ritmo: caixa de métricas → respiro → lista limpa → botão.

## Arquivo

- `src/components/landing/InvestSection.tsx` — substituir o bloco "Diferenciais exclusivos" (linhas ~251-282) pela versão minimal descrita.

## Fora de escopo

- Cores, fonts, métricas, preços, badges, CTAs.
- Manter `inheritsFrom` no array (já está pronto).