## Objetivo

Remover o fundo escuro (`bg-ivero-dark`) das seções da landing page e unificar todas em tema claro, usando variações sutis de tonalidade para distinguir cada seção sem cansar visualmente.

## Seções afetadas

Hoje em escuro: **Hero**, **Steps**, **CTA**, **Invest (Planos)**, **Footer**.
Hoje em claro: Problem, Features, Audience, FAQ.

## Paleta clara em camadas (sutil)

Sequência intercalada para criar ritmo sem contraste agressivo:

| Tom | HSL | Uso sugerido |
|---|---|---|
| `surface-0` (puro) | `0 0% 100%` (#FFFFFF) | Hero, CTA, FAQ |
| `surface-1` (off-white) | `230 20% 98.5%` | Problem, Invest |
| `surface-2` (lavanda quase branca) | `265 30% 97%` | Steps, Audience |
| `surface-3` (cinza-azulado claro) | `230 15% 95%` | Features |
| `footer` (lavanda um pouco mais densa) | `265 25% 94%` | Footer |

Criar tokens novos em `src/index.css` (`--surface-0…3`, `--footer-bg`) e expor no `tailwind.config.ts` como `bg-surface-0`, `bg-surface-1` etc. Mantém coerência com o hue 265° já usado.

## Mudanças por seção

**HeroSection** — hoje dark com input "glow roxo".
- Trocar `bg-ivero-dark` → `bg-surface-0` (branco)
- Glow roxo do input: manter, mas reduzir intensidade da sombra (de 60px para 24px) para ficar elegante em fundo claro
- Input field: `bg-ivero-dark-surface` → `bg-white border-ivero-purple/25`
- Textos brancos (`text-primary-foreground`, `text-ivero-slate-light`) → `text-foreground` / `text-muted-foreground`
- Form lateral (lead capture): mesma conversão, fundo branco com borda roxa sutil

**StepsSection** — `bg-ivero-dark` → `bg-surface-2`
- Cards/ícones internos (`bg-ivero-dark-surface`) → `bg-white border-ivero-purple/15`
- Textos claros → `text-foreground`/`muted-foreground`
- Linha de conexão gradient: manter (já é vibrante, fica bom em claro)

**CTASection** — `bg-ivero-dark` → `bg-surface-0`
- Glow blobs roxo/accent: reduzir opacidade (de /15 e /10 para /8 e /5) para suavizar em fundo claro
- Cards de stats: `bg-ivero-dark-surface/60` → `bg-surface-2 border-ivero-purple/15`
- Headline branca → `text-foreground`
- Botão hero (gradiente roxo→pink): mantém

**InvestSection (Planos)** — `bg-ivero-dark` → `bg-surface-1`
- ⚠️ Conflita com memory `pricing-cards-refinement` ("Unified dark mode with magenta borders and white typography"). Os cards de pricing precisam ser convertidos para tema claro: fundo branco, bordas magenta/roxo, tipografia escura, mantendo destaque do plano recomendado com sombra accent.
- Toggle mensal/anual e badge de desconto: ajustar contrastes
- Atualizar memory `pricing-cards-refinement` após a mudança

**Footer** — `bg-ivero-dark` → `bg-footer-bg` (lavanda clara)
- Tipografia branca → escura
- Bordas e divisores: usar `border-ivero-purple/15`
- Ilustração da rede neural: garantir que continua visível em fundo claro (provavelmente trocar stroke claro → roxo)

## Detalhes técnicos

1. **Tokens CSS** (`src/index.css`): adicionar 5 variáveis novas no `:root`.
2. **Tailwind** (`tailwind.config.ts`): adicionar entradas `surface: { 0, 1, 2, 3 }` e `footer-bg` em `colors`.
3. **Substituições por arquivo**: trocar classes de bg/borda/texto conforme tabela acima.
4. **Tom de leitura**: garantir contraste WCAG AA — usar `text-foreground` (`230 25% 15%`) para títulos e `text-muted-foreground` para corpo, em todas as seções convertidas.
5. **Memórias a atualizar**:
   - `mem://style/hero-section` — passa a ser tema claro com glow roxo suave
   - `mem://style/pricing-cards-refinement` — fundo branco, bordas magenta, tipografia escura
   - `mem://style/visual-identity` — landing inteira em tema claro com camadas sutis (deixa de ser "hybrid"); Core do índice precisa refletir isso
   - `mem://index.md` Core: remover "Dark minimal Landing Page" do hybrid theme

## Risco / pontos a confirmar

- O Hero perde a estética "premium dark" atual. Quer mesmo em **branco puro**, ou prefere o hero em `surface-2` (lavanda muito clara) para ainda dar um ar de destaque na primeira dobra?
- Posso manter pequenos blobs de glow roxo/accent por trás de Hero/CTA/Invest para reter o "DNA" visual da marca, só com opacidade bem reduzida.

Após sua aprovação, implemento tudo de uma vez e atualizo as memórias.