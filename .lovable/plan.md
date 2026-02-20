
## Fix: Botão "Descubra sua visibilidade em IA" — preencher totalmente no desktop

### Diagnóstico preciso

No arquivo `src/components/landing/HeroSection.tsx`, linha 63, o wrapper do input pill tem `sm:max-w-xl` como largura máxima no desktop. Dentro dele (linha 65), o container flex usa `sm:flex-row` com `sm:pl-5 sm:pr-1.5`.

O problema está na distribuição interna do espaço:
- O `input` tem `flex-1` — correto, expande para preencher
- O `Button` (linha 73) tem `shrink-0` — não encolhe, mas também **não cresce**

No desktop (`sm:flex-row`), o botão fica com seu tamanho intrínseco (apenas o suficiente para o texto), e o `input` pega todo o `flex-1`. O botão não preenche até a borda direita do container porque o `pr-1.5` do container cria um gap e o botão não se expande.

A solução não é `w-full` (que quebraria o desktop), mas sim remover o `sm:max-w-xl` do wrapper externo e garantir que o botão se ajuste corretamente ao container pill — ou, alternativamente, deixar o botão ser `flex-shrink-0` com um `min-w` fixo que garanta ele tocar a borda.

### Causa raiz

O container pill no desktop tem `sm:pr-1.5` (padding interno de 6px à direita) para que o botão fique com um pequeno respiro da borda. O botão usa apenas `shrink-0` + tamanho intrínseco. O `input` com `flex-1` "empurra" o botão para a direita, mas o botão não cresce lateralmente para tocar a borda interna do container — ele simplesmente para no seu tamanho natural.

### Solução cirúrgica

**Linha 63** — remover `sm:max-w-xl` do wrapper div para que o container do input ocupe a largura total disponível da coluna esquerda do grid. Isso faz o pill se estender completamente, e o input + botão preenchem toda a largura.

**Linha 73** — no Button, substituir `shrink-0` por nada (o botão já não precisa de shrink-0 quando o input tem flex-1) e confirmar que não há `w-auto` limitando.

**Mudanças:**

```tsx
// Linha 63 — ANTES
<div className="flex flex-col gap-3 w-full sm:max-w-xl">

// Linha 63 — DEPOIS
<div className="flex flex-col gap-3 w-full">
```

```tsx
// Linha 73 — ANTES
className="text-sm px-5 sm:px-6 h-12 sm:h-11 shrink-0 sm:rounded-full rounded-none rounded-b-2xl sm:rounded-b-none mx-0"

// Linha 73 — DEPOIS
className="text-sm px-5 sm:px-6 h-12 sm:h-11 w-full sm:w-auto sm:rounded-full rounded-none rounded-b-2xl sm:rounded-b-none mx-0"
```

### Por que funciona

- Sem `sm:max-w-xl`, o pill ocupa toda a largura da coluna esquerda do grid (`lg:grid-cols-2`)
- O `input` com `flex-1` preenche o espaço disponível dinamicamente
- O botão com `w-full sm:w-auto` fica `w-full` no mobile (empilhado) e `w-auto` no desktop (tamanho intrínseco ao lado do input)
- O container pill já tem `overflow-hidden` que garante que o botão respeite os cantos arredondados

### Arquivo alterado

- `src/components/landing/HeroSection.tsx` — apenas 2 linhas modificadas (63 e 73)
