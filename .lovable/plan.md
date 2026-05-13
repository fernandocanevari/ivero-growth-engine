## Resumo

Resolver dois pontos no `InvestSection.tsx`:
1. **Alinhar a base dos 3 cards** (botões CTA na mesma linha mesmo com conteúdos diferentes).
2. **Destacar visualmente os "diferenciais exclusivos"** — comunicar que cada plano herda tudo do anterior + adiciona estes itens novos.

## Arquivo

- `src/components/landing/InvestSection.tsx`

## Mudanças

### 1. Alinhamento da base dos cards

Hoje cada card tem altura natural — o bloco de "Diferenciais" usa `flex-1`, mas o número de itens varia (2 por plano, ok), e variações de tagline/preço empurram os botões para alturas diferentes.

Para forçar alinhamento perfeito do CTA:
- Adicionar `min-h` fixo ao bloco de diferenciais (por ex. `min-h-[120px] sm:min-h-[140px]`) para acomodar até 3 linhas com folga.
- Manter `mt-auto` no botão (já existe) para garantir que o CTA encoste no fundo.
- Garantir `h-full` no container interno do card para ocupar toda a altura disponível do grid (já está com `flex-1`).

### 2. Bloco "Diferenciais exclusivos" reformulado

Substituir a `<ul>` simples atual por uma **caixa destacada** com:

- **Header de contexto** (linha pequena, uppercase, em accent):
  - Plano Presença: "✦ O essencial para começar"
  - Plano Influência: "✦ Tudo do Presença + exclusivos"
  - Plano Autoridade: "✦ Tudo do Influência + exclusivos"

- **Container destacado** com:
  - Fundo gradiente sutil (accent/5 ou ivero-purple/5 conforme `highlighted`)
  - Borda `border-l-2` colorida (faixa lateral em accent ou ivero-purple)
  - Padding generoso, cantos arredondados
  - Itens com ícone de "+" ou "Sparkles" (lucide) ao invés de ✦, mais expressivo
  - Texto dos diferenciais em `font-semibold text-foreground` (mais peso visual)

Resultado: o cliente bate o olho e entende imediatamente "esse plano tem TUDO do anterior MAIS isso aqui de novo".

### 3. Texto do header dependente do plano

Adicionar nova propriedade no array `plans`:
```ts
inheritsFrom: null | "Presença" | "Influência"
```
- Presença: `null` → header "✦ O essencial para começar"
- Influência: `"Presença"` → "Tudo do Presença +"
- Autoridade: `"Influência"` → "Tudo do Influência +"

## Design / Responsivo

- Mantém o design system (cores `accent`, `ivero-purple`, fontes existentes).
- Mobile-first: padding reduzido em telas pequenas, altura mínima ajustada.
- Animação sutil (Framer Motion) opcional no ícone "+" ao hover do card.

## Fora de escopo

- Não alterar preços, badges, CTAs ou métricas.
- Não alterar o "Selo de garantia Ivero" abaixo dos cards.