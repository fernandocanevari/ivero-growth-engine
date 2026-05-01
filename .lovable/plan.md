# Correções no Blog

7 ajustes pontuais em 4 arquivos. Sem novas dependências, sem mudança estrutural.

## 1. Header do /blog — remover chip e subtítulo (anexos 1 e 2)

**Arquivo:** `src/pages/BlogIndexPage.tsx`

Remover:
- O chip "BLOG IVERO" com ícone Sparkles (já redundante com o `<h1>` e o Navbar).
- O parágrafo subtítulo "Análises e roteiros táticos…".

Manter apenas o `<h1>` "Inteligência editorial sobre GEO e IAs", que fica mais limpo e direto.

## 2. Layout do grid de artigos — simetria (anexo 3)

**Arquivo:** `src/pages/BlogIndexPage.tsx`

Hoje o grid é `lg:grid-cols-3` e o post pilar ocupa `col-span-3` (largura total). Os 4 posts restantes formam **3 + 1 órfão**, gerando a desproporção.

Mudar para grid de 2 colunas no desktop:
- `grid-cols-1 sm:grid-cols-2` (sem `lg:grid-cols-3`)
- Card pilar: `sm:col-span-2` (ocupa toda a primeira linha)
- 4 cards restantes: 2 + 2 (duas linhas simétricas)

Resultado: layout `1 + 2 + 2`, todos os cards com largura proporcional.

## 3. Cards de artigo — mais ênfase visual

**Arquivo:** `src/components/blog/BlogCard.tsx`

Atualmente: borda `border-border` (cinza neutro), hover discreto. Vai ganhar:
- Borda base mais visível (`border-foreground/10`) e shadow sutil de repouso (`shadow-sm`).
- Hover: `border-primary/50`, `shadow-xl`, `-translate-y-1` (lift).
- Tag "PILAR" com gradient da marca (em vez de preto sólido).
- Seta `ArrowUpRight` num círculo com `bg-primary/10`, ganha `bg-primary text-white` no hover.
- Card pilar ganha um glow lateral sutil no hover (`shadow-primary/20`).

## 4. CTA dentro do conteúdo (block "cta") — mais ênfase

**Arquivo:** `src/components/blog/BlogContent.tsx` (case `"cta"`)

Hoje: gradient muito sutil, botão preto pequeno. Vai virar:
- Fundo: `bg-gradient-to-br from-primary/15 via-primary/5 to-card` com borda `border-primary/30` (2px).
- Decorative glow no canto (mesmo padrão do `BlogPostCTA`).
- Texto principal maior (`text-xl sm:text-2xl`).
- Botão `bg-primary text-primary-foreground` com `shadow-lg shadow-primary/30` e hover lift.
- Ícone `Sparkles` no chip "AÇÃO" no topo do bloco para criar consistência visual com o CTA do final.

## 5. Corrigir destino do CTA "Auditar marca grátis" (anexo 4)

**Arquivo:** `src/content/blog/monitorar-ias-vs-google.ts` (linha 87-91)

Hoje aponta para `/preview` direto — pula o lead-gate (não pede nome/email/site).

Trocar `href: "/preview"` por `href: "/#diagnostico"` para enviar o usuário ao mesmo fluxo padronizado de captura de lead do hero.

(Os outros 4 posts já apontam para `/preview` também — vou padronizar todos para `/#diagnostico` para consistência.)

## 6. Corrigir âncora #diagnostico na home (anexo 5)

**Problema:** `BlogPostCTA` e os blocks `cta` mandam para `/#diagnostico`, mas a home não tem nenhum elemento com `id="diagnostico"` — por isso o usuário cai no topo da página inicial sem nada acontecer.

**Arquivo:** `src/components/landing/HeroSection.tsx`

Adicionar `id="diagnostico"` no `<section>` do hero (linha 90). Como o hero já contém **os dois** capturadores de lead (input pill + form completo no desktop), aterrissar nele é a UX correta — o usuário chega exatamente onde deve digitar o site.

## 7. Padronizar todos os CTAs em conteúdo

**Arquivos:** `src/content/blog/*.ts` (5 posts)

Todos os blocks `type: "cta"` vão apontar para `/#diagnostico` (preservando os UTMs onde já existem). Garante uma única jornada de conversão a partir do blog.

---

## Resumo dos arquivos

```text
src/pages/BlogIndexPage.tsx              (header + grid)
src/components/blog/BlogCard.tsx         (ênfase nos cards)
src/components/blog/BlogContent.tsx      (ênfase no CTA inline)
src/components/landing/HeroSection.tsx   (id="diagnostico")
src/content/blog/geo-vs-aeo-vs-aio.ts    (href CTA)
src/content/blog/como-marca-aparece-em-ias.ts (href CTA)
src/content/blog/ai-influence-score.ts   (href CTA)
src/content/blog/checklist-geo-12-acoes.ts (href CTA)
src/content/blog/monitorar-ias-vs-google.ts (href CTA + label)
```

Posso aplicar?
