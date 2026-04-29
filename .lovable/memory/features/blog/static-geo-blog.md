---
name: Blog estático GEO
description: /blog secundário com 5 posts estáticos otimizados para GEO (keywords destacadas, FAQ schema), gestão via arquivos em src/content/blog
type: feature
---
Blog secundário em `/blog` e `/blog/:slug`, **fora da navbar** (só linkado via Footer).

**Gestão estática (Opção 1 — sem CMS)**:
- Cada post é um arquivo `.ts` em `src/content/blog/<slug>.ts` exportando `const post: BlogPost`
- Registro central em `src/content/blog/index.ts` (array POSTS)
- Tipos em `src/content/blog/types.ts` — `Block` é discriminated union (paragraph | heading | list | quote | callout | cta)
- Para adicionar post: criar arquivo + registrar no index + (opcional) adicionar em related[]

**Sistema de destaque de keywords (GEO)**:
- `<KeywordHighlight>` envolve a 1ª ocorrência de cada keyword em `<mark>` com gradient marca-texto sutil
- Ordenação longest-first evita conflito entre frases e substrings
- Cada post declara `keywords[]` no objeto

**SEO/GEO técnico**:
- `src/lib/seo.ts` injeta meta tags + JSON-LD (Article + FAQPage) via DOM direto (sem react-helmet)
- Resumo executivo (3-4 bullets no topo) — formato extraível por LLMs
- FAQ no final com schema FAQPage
- `public/sitemap.xml` lista blog + posts; `robots.txt` aponta para sitemap

**5 posts iniciais** (cluster de SEO, pilar + 4 satélites):
1. `/blog/geo-vs-aeo-vs-aio` (pilar)
2. `/blog/como-marca-aparece-em-ias`
3. `/blog/ai-influence-score`
4. `/blog/checklist-geo-12-acoes`
5. `/blog/monitorar-ias-vs-google`

**Página legal**: `/politica-de-cookies` (mesmo template visual de `/politica-de-privacidade`). Banner de cookies linka para ambas.

**Analytics**: eventos `blog_index_view`, `blog_post_view`, `blog_cta_click` via `lib/analytics.ts` (PostHog).
