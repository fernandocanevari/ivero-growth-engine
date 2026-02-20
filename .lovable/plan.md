
# Simplificar os Cards de Planos

## Objetivo

Reduzir a poluição visual dos cards de planos, substituindo a longa lista de features por:

1. **Faixa de métricas-chave** (logo abaixo do preço) com ícones e valores concretos por plano
2. **Apenas 1-2 diferenciais exclusivos** por plano (o que torna aquele tier único)
3. **Remover os itens bloqueados** (locked) — eles aumentam o tamanho sem agregar valor
4. **Rodapé comum** abaixo dos 4 cards com as features que todos os planos têm

---

## Estrutura Nova de Cada Card

```text
┌──────────────────────────────┐
│  BADGE (fixo para alinhamento)│
├──────────────────────────────┤
│  NOME DO PLANO               │
│  Tagline                     │
├──────────────────────────────┤
│  PREÇO / Economia anual      │
├──────────────────────────────┤
│  MÉTRICAS-CHAVE (ícones)     │
│  📡 X IAs monitoradas        │
│  🔔 X Avisos/mês             │
│  🔍 X Prompts monitorados    │
│  📊 X Consultas/mês          │
├──────────────────────────────┤
│  DIFERENCIAIS (1-2 itens)    │
│  ✦ Diferencial exclusivo     │
├──────────────────────────────┤
│  [ BOTÃO CTA ]               │
│  Sem contrato. Cancele...    │
└──────────────────────────────┘
```

---

## Métricas por Plano

| Métrica             | Presença | Influência | Autoridade | Domínio    |
|---------------------|----------|------------|------------|------------|
| IAs monitoradas     | 2        | 3          | 4          | 5          |
| Avisos/mês          | 50       | 200        | Ilimitados | Ilimitados |
| Prompts monitorados | 10       | 30         | 100        | Ilimitados |
| Consultas/mês       | 500      | 2.000      | 10.000     | Ilimitadas |

---

## Diferenciais Exclusivos (1-2 por plano)

- **Presença**: Score GEO de Visibilidade + Relatório semanal por e-mail
- **Influência**: Análise de Sentimento + Alertas no Slack
- **Autoridade**: Mapa de Prompts Estratégicos + Múltiplos canais Slack
- **Domínio**: Dominância por Modelo de IA + Simulador de Influência em IA

---

## Rodapé comum (abaixo dos 4 cards)

Uma linha de texto sutil listando o que todos os planos incluem:

> ✦ Todos os planos incluem: Dashboard GEO · Score de Visibilidade · Suporte prioritário · Sem contrato

---

## Alterações Técnicas

**Arquivo:** `src/components/landing/InvestSection.tsx`

- Adicionar campo `metrics` ao objeto de cada plano (array com `{ icon, label, value }`)
- Adicionar campo `highlights` (1-2 diferenciais exclusivos, substituindo a lista de features)
- Remover campo `locked` (não será mais exibido)
- Remover o campo `features` com lista longa
- No JSX, substituir a `<ul>` de features por:
  1. Grid 2x2 de métricas com ícone + valor em destaque + label abaixo
  2. Lista curta de diferenciais (máx. 2 itens)
- Adicionar bloco de rodapé comum abaixo do grid de cards
