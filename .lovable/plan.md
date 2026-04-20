

## Transformar CTA pós-Score em bloco de alto impacto visual

### Diagnóstico do problema atual

O bloco atual usa:
- Fundo `bg-gradient-to-br from-primary/[0.04] via-card to-card` → quase branco, mistura com os cards de diagnóstico ao redor
- Borda fina `border-primary/20` → idêntica aos cards de pilares
- Linha de 2px no topo → discreta demais
- Tipografia 2xl → mesmo tamanho dos títulos de seção do diagnóstico
- Layout 2 colunas equilibradas → parece "mais um card informativo"

Resultado: o olho do usuário escaneia e ignora, achando que é continuação do diagnóstico.

### Nova direção visual: "interrupção"

A regra de CTA forte é **quebrar o padrão** da página. Como o PreviewPage é Premium Light (branco/cards claros), o CTA precisa virar uma **ilha escura com gradiente Ivero vivo**, contrastando com tudo ao redor.

### Mudanças específicas

**1. Fundo dramático (inversão de tema)**
- Trocar fundo claro por `bg-gradient-to-br from-[#1a0b2e] via-[#2d1b4e] to-[#3d1a4e]` (deep purple → magenta hint)
- Adicionar mesh/glow: 2 blobs radiais magenta + roxo no fundo (blur-3xl, opacity 40%)
- Borda externa: `border-2 border-transparent` com `bg-clip` para gradiente animado magenta→roxo

**2. Escala e respiração**
- Padding interno generoso: `p-8 sm:p-10 lg:p-12` (era p-6/7)
- Margem vertical extra: `my-8` para destacar do bloco anterior/próximo
- Adicionar `shadow-[0_20px_80px_-20px_rgba(168,85,247,0.5)]` (glow magenta abaixo)

**3. Tipografia agressiva**
- Headline: `text-3xl sm:text-4xl lg:text-5xl` (antes 2xl), branco puro
- Manter "Domine sua categoria" em gradiente magenta vivo
- Badge superior maior, com pulse animado no ícone Sparkles

**4. Botão CTA monumental**
- Botão "Criar conta gratuita": altura `h-14 sm:h-16`, fonte `text-base sm:text-lg`, fundo branco sólido com texto roxo escuro (inversão para contraste máximo dentro do bloco escuro)
- Adicionar hover: `scale-105` + glow expandido
- Seta animada (slide-right no hover)
- Botão "Já sou cliente": ghost transparente com borda branca sutil, secundário visualmente

**5. Selos de confiança em destaque**
- Mover os 3 selos (100% grátis / Sem cartão / Cancele quando quiser) para **acima dos botões**, em pílulas com fundo `bg-emerald-500/15 border border-emerald-400/40`, texto verde claro `text-emerald-300`
- Tamanho maior: `text-xs sm:text-sm`, padding `px-3 py-1.5`
- Centralizadas e visíveis antes de qualquer clique

**6. Urgência sutil (sem cair em hype)**
- Manter copy "Enquanto você lê, seus concorrentes estão sendo recomendados…" mas com `text-white/85` para legibilidade no fundo escuro
- Lista de bullets: ícones CheckCircle2 em verde brilhante (`text-emerald-400`), texto branco/85

**7. Animação de entrada**
- Já está dentro de `AnimatedSection` — adicionar `whileInView` scale de 0.96 → 1 + glow pulsante contínuo na borda

### Layout final (wireframe)

```text
┌──────────────────────────────────────────────────────┐
│ [glow magenta] [glow roxo] (background mesh)         │
│                                                      │
│  ✨ SUA MARCA MERECE MAIS                            │
│                                                      │
│  Pare de ser invisível para as IAs.                  │
│  Domine sua categoria.          ← 4xl/5xl branco     │
│                                                      │
│  Enquanto você lê, seus concorrentes…                │
│                                                      │
│  ✓ Histórico ilimitado                               │
│  ✓ Análise completa de cada pilar                    │
│  ✓ Convergência ChatGPT, Claude, Gemini…             │
│                                                      │
│   [✓ 100% grátis] [✓ Sem cartão] [✓ Cancele]        │
│                                                      │
│   ┌────────────────────────────────────────────┐    │
│   │   Criar conta gratuita        →            │    │ ← branco, h-16
│   └────────────────────────────────────────────┘    │
│         Já sou cliente — Entrar                      │ ← ghost branco
│                                                      │
└──────────────────────────────────────────────────────┘
   (shadow magenta glow embaixo)
```

Layout passa de 2 colunas para **1 coluna centralizada** (max-w-3xl mx-auto) — força o olho a percorrer headline → benefícios → botão sem distração lateral.

### Arquivo modificado

- `src/pages/PreviewPage.tsx` — substituir o bloco CTA (linhas 805-868) pela nova versão dark/dramática

