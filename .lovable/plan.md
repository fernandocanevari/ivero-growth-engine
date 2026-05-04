## Objetivo

Aumentar o contraste entre as seções da landing page para que cada bloco tenha identidade visual clara ao rolar, sem perder o ar executivo/premium e sem usar elementos divisores.

## Diagnóstico atual

Os 5 tokens variam só 1-3% de luminosidade — quase invisível:

| Token | Hoje | Uso |
|---|---|---|
| `--surface-0` | `0 0% 100%` | Hero, CTA |
| `--surface-1` | `230 20% 98.5%` | ProblemSection, InvestSection |
| `--surface-2` | `265 30% 97%` | StepsSection, AudienceSection |
| `--surface-3` | `230 15% 95%` | FeaturesSection |
| `--footer-bg` | `265 25% 94%` | Footer |

Resultado: tudo parece "uma página só".

## Nova paleta (nível médio, ~6-9% de variação + alternância de matiz)

Cada token mantém o nome para não quebrar nada — só mudam os valores HSL no `src/index.css`:

| Token | Novo valor | Cor aproximada | Função |
|---|---|---|---|
| `--surface-0` | `0 0% 100%` | Branco puro | Hero, CTA (limpeza) |
| `--surface-1` | `230 25% 96%` | Cinza-azulado claro | ProblemSection |
| `--surface-2` | `265 40% 93.5%` | Lavanda perceptível | StepsSection, AudienceSection |
| `--surface-3` | `230 20% 91%` | Cinza-azulado médio | FeaturesSection |
| `--footer-bg` | `265 35% 89%` | Lavanda densa | Footer |

Diferença entre seções vizinhas: ~4-7% — passa do limiar de percepção sem ficar "carnavalesco". A alternância matiz neutro ↔ lavanda cria ritmo (estilo Linear/Stripe).

## Sequência visual após mudança

```text
Hero            → branco puro
Problem         → cinza-azulado claro
Steps           → lavanda nítida
Features        → cinza-azulado médio
CTA             → branco puro (respiro)
Audience        → lavanda nítida
Invest          → cinza-azulado claro
FAQ             → branco (mantém)
Footer          → lavanda densa (fechamento)
```

Branco no meio (CTA) funciona como "respiro" entre lavandas, evitando fadiga.

## Ajustes secundários necessários

1. **Cards internos que hoje usam `bg-white` sobre `surface-1`**: continuam OK, ganham até mais destaque com fundo mais escuro.
2. **CTASection cards** (`bg-surface-2` sobre `surface-0`): com a nova lavanda mais forte, reduzir borda de `ivero-purple/15` → `/20` para manter equilíbrio.
3. **InvestSection toggle pill** (`bg-white` sobre `surface-1`): ganha contraste automático, sem ajuste.
4. **Footer**: revisar contraste dos textos `muted-foreground` sobre o novo `footer-bg` mais denso (provável OK, mas verificar visualmente).

## Arquivos afetados

- `src/index.css` — atualizar 5 valores HSL dos tokens de surface (única mudança estrutural).
- `src/components/landing/CTASection.tsx` — micro-ajuste de borda dos cards internos (opcional, decidir após preview).
- `src/components/landing/Footer.tsx` — verificar contraste de textos secundários (ajuste só se necessário).

Nada de Tailwind config, nada de classes nos componentes — só os tokens.

## Validação

Após aplicar, rolo a landing inteira e confirmo:
- Cada transição entre seções é perceptível em ~0.5s de scroll
- Nenhum texto fica abaixo de contraste legível
- A paleta roxa/magenta da marca continua dominante

Se algum tom ficar forte demais, ajusto fino (±2% de luminosidade) sem precisar de novo ciclo de aprovação.
