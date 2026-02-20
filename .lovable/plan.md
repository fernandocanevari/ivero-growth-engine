
## Animações de Scroll Suave — Abordagem Minimalista

### Diagnóstico atual

Todos os componentes já importam e usam `framer-motion`. A base está ótima — o que falta é refinar a qualidade das animações existentes e adicionar dois efeitos específicos solicitados:

1. **Parallax no HeroSection** — os elementos de fundo (glows, streak) se movem levemente enquanto o usuário scrolla, criando profundidade sem chamar atenção para si mesmos.
2. **Transições mais elaboradas nos cards da InvestSection** — entrada escalonada mais sofisticada ao entrar na viewport.
3. **Scroll suave global** — garantir que o `scroll-behavior: smooth` esteja ativo para os links de âncora do Navbar.

---

### O que será tocado (apenas 3 arquivos)

**1. `src/index.css`** — adicionar `scroll-behavior: smooth` no `html`, que ativa o scroll suave nos links `#recursos`, `#como-funciona`, etc. do Navbar. Uma linha só.

**2. `src/components/landing/HeroSection.tsx`** — parallax sutil nos elementos decorativos de fundo usando `useScroll` + `useTransform` do Framer Motion:
- O glow roxo (`bottom-0 right-0`) se move `+30px` no Y conforme o usuário desce
- O glow pink se move `+20px` no Y (velocidade diferente = sensação de profundidade)
- A "light streak" se move `-15px` (sobe levemente, efeito oposto)
- O conteúdo principal (`motion.div` com o texto) se move `-10px` suavemente (efeito de flutuar para cima ao scrollar — clássico e elegante)
- Nenhum `transform` agressivo, tudo dentro de `[0, 300]` pixels de scroll

**3. `src/components/landing/InvestSection.tsx`** — transição de entrada dos 4 cards mais sofisticada:
- Substituir o simples `y: 30 → 0` atual por uma combinação de `y + opacity + scale` (de `0.97` para `1`)
- Usar `viewport={{ once: true, margin: "-80px" }}` para que o trigger seja um pouco antes de entrar na viewport (mais orgânico)
- Delay escalonado ligeiramente maior entre os cards (`0.12s`) para o efeito de "cascata" ficar perceptível mas não dramático
- Adicionar `transition: { type: "spring", stiffness: 80, damping: 20 }` — spring physics deixa a chegada mais natural que `easeOut` linear

---

### O que NÃO será feito (para manter o minimalismo)

- Sem parallax no texto/conteúdo principal do Hero (preserva legibilidade)
- Sem animações de hover adicionais (já existem e estão boas)
- Sem mudança nas demais seções (ProblemSection, StepsSection já têm `whileInView` adequados)
- Sem efeitos de "blur no scroll" ou transformações de opacidade agressivas
- Sem bibliotecas adicionais

---

### Implementação técnica — HeroSection (parallax)

```tsx
// Hooks adicionados
import { useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const sectionRef = useRef(null);
const { scrollYProgress } = useScroll({
  target: sectionRef,
  offset: ["start start", "end start"],
});

// Transforms individuais por velocidade
const glowPurpleY  = useTransform(scrollYProgress, [0, 1], [0, 80]);
const glowPinkY    = useTransform(scrollYProgress, [0, 1], [0, 50]);
const streakY      = useTransform(scrollYProgress, [0, 1], [0, -40]);
const contentY     = useTransform(scrollYProgress, [0, 1], [0, -30]);
```

Os `motion.div` dos glows recebem `style={{ y: glowPurpleY }}` etc. O conteúdo principal recebe `style={{ y: contentY }}`.

---

### Implementação técnica — InvestSection (cards)

```tsx
// Antes (simples)
initial={{ opacity: 0, y: 30 }}
whileInView={{ opacity: 1, y: 0 }}
transition={{ delay: index * 0.1 }}

// Depois (spring + scale sutil)
initial={{ opacity: 0, y: 24, scale: 0.97 }}
whileInView={{ opacity: 1, y: 0, scale: 1 }}
viewport={{ once: true, margin: "-80px" }}
transition={{ 
  type: "spring", 
  stiffness: 80, 
  damping: 20, 
  delay: index * 0.12 
}}
```

---

### Resultado esperado

Ao scrollar pela landing, o usuário perceberá:
- Os glows do Hero se movendo em velocidades diferentes (profundidade tridimensional discreta)
- Os cards de planos "chegando" com uma física de mola natural, não mecânica
- Os links do Navbar (#recursos, #precos etc.) scrollando suavemente até a âncora

Tudo dentro da filosofia que você definiu: **o movimento serve ao conteúdo, nunca compete com ele**.
