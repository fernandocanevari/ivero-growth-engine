## Objetivo

Criar um blog secundário em `/blog` com 5 artigos otimizados para GEO (Generative Engine Optimization), gestão estática no código, com sistema de destaque visual de palavras-chave, schema.org, e adicionar página legal `/politica-de-cookies`. A landing page e o restante do app não sofrem alterações estruturais — apenas links no Footer e no banner de cookies.

---

## Arquitetura

### Rotas novas (em `src/App.tsx`)

```text
/blog                      → Índice (lista de posts, hero editorial)
/blog/:slug                → Post individual
/politica-de-cookies       → Página legal (mesmo padrão de /politica-de-privacidade)
```

Posts ficam estáticos em `src/content/blog/` — cada post é um objeto TypeScript tipado, renderizado por um único componente `BlogPost`. Para publicar um novo post você (ou eu) cria um arquivo, registra no `index.ts`, e pronto.

### Estrutura de arquivos

```text
src/
├── content/blog/
│   ├── types.ts                        ← Interface BlogPost
│   ├── index.ts                        ← Registro (array exportado)
│   ├── geo-vs-aeo-vs-aio.ts            ← Post pilar
│   ├── como-marca-aparece-em-ias.ts
│   ├── ai-influence-score.ts
│   ├── checklist-geo-12-acoes.ts
│   └── monitorar-ias-vs-google.ts
├── components/blog/
│   ├── BlogLayout.tsx                  ← Header + container claro + Footer
│   ├── BlogCard.tsx                    ← Card do índice
│   ├── BlogPostHero.tsx                ← Hero do post (título, autor, data, tempo de leitura)
│   ├── BlogContent.tsx                 ← Renderiza blocos (parágrafo, h2, h3, lista, FAQ, CTA, callout)
│   ├── KeywordHighlight.tsx            ← <mark> estilizado para keywords
│   ├── BlogFAQ.tsx                     ← Bloco FAQ + injeção de FAQPage schema
│   ├── BlogCTA.tsx                     ← CTA inline pra /preview ou /auth
│   └── RelatedPosts.tsx                ← Cluster de SEO no fim de cada post
├── pages/
│   ├── BlogIndexPage.tsx               ← /blog
│   ├── BlogPostPage.tsx                ← /blog/:slug
│   └── PoliticaCookiesPage.tsx         ← /politica-de-cookies
└── lib/
    └── seo.ts                          ← Helpers de meta tags + JSON-LD
```

---

## Sistema de destaque de keywords (GEO aplicado)

Cada post declara seu array de `keywords` (ex: `["GEO", "Generative Engine Optimization", "Ivero", "AI Influence Score"]`). O `BlogContent` percorre o texto e envolve a primeira ocorrência de cada keyword em `<KeywordHighlight>`, que renderiza um `<mark>` estilizado.

**Estilo do destaque** (premium, não chamativo):
- Background `linear-gradient(transparent 60%, hsl(var(--primary)/0.18) 60%)` — efeito marca-texto sutil
- `font-weight: 600`, cor `text-foreground`
- Hover revela tooltip discreto com a definição (opcional)

**Por que isso funciona pra GEO + SEO:**
- LLMs (Perplexity, ChatGPT search, Gemini) priorizam termos visualmente proeminentes e em `<strong>`/`<mark>` ao extrair respostas
- Google reconhece relevância semântica via marcação HTML
- Frequência controlada (1ª ocorrência só) evita keyword stuffing

Além do destaque inline, cada post tem:
- **Bloco "Resumo executivo"** (3-4 bullets no topo) — formato que IAs amam citar
- **FAQ no final** (4-6 perguntas) com `FAQPage` JSON-LD — aparece em rich results e é a fonte preferida de IAs generativas
- **`Article` JSON-LD** com author, datePublished, keywords
- **Meta tags OpenGraph + Twitter Card** dinâmicas

---

## Os 5 posts (cluster de SEO)

1. **`/blog/geo-vs-aeo-vs-aio`** *(pilar)* — "GEO vs AEO vs AIO: o guia definitivo para marcas em 2026"
2. **`/blog/como-marca-aparece-em-ias`** — "Como sua marca aparece (ou some) no ChatGPT, Gemini e Perplexity"
3. **`/blog/ai-influence-score`** — "AI Influence Score: o novo KPI que substitui o ranking do Google"
4. **`/blog/checklist-geo-12-acoes`** — "Checklist GEO: 12 ações para sua marca ser citada por IAs"
5. **`/blog/monitorar-ias-vs-google`** — "Por que monitorar IAs é mais urgente que monitorar o Google em 2026"

Os 4 satélites linkam para o pilar; o pilar linka para todos. Cada post tem 1.500-2.000 palavras, tom executivo (sem informalidade), e termina com CTA pra `/preview` (diagnóstico grátis).

---

## Página /politica-de-cookies

Mesmo template visual de `PoliticaPrivacidadePage`. Conteúdo cobre:
- O que são cookies
- Cookies usados pela Ivero (PostHog analytics — opt-in via banner)
- Como gerenciar/revogar consentimento
- Direitos LGPD

O `CookieConsentBanner.tsx` ganha um segundo link "Política de cookies" ao lado do "Saiba mais" (que continua apontando pra privacidade).

---

## Integrações com a base existente

- **Footer** (`src/components/landing/Footer.tsx`): substituir os `<a href="#">` por links reais — coluna "Empresa" → Blog (`/blog`); coluna "Legal" → Privacidade (`/politica-de-privacidade`), Cookies (`/politica-de-cookies`), Termos (placeholder por enquanto)
- **Navbar**: NÃO adicionar Blog na navbar principal (decisão prévia: blog é secundário). Acesso só via Footer e links inline em outros pontos
- **CookieConsentBanner**: adicionar link pra `/politica-de-cookies`
- **Landing/Dashboard**: zero alterações estruturais

---

## Estilo visual

- **Tema claro** (`#FFFFFF`), seguindo padrão `PoliticaPrivacidadePage` e Dashboard — leitura longa exige contraste
- Tipografia: `Space Grotesk` em títulos, `Inter` no corpo, `text-lg leading-[1.75]` no parágrafo (padrão editorial premium tipo Stripe Press / Linear blog)
- Largura máxima do conteúdo: `max-w-[680px]` (linha de leitura ideal ~70 caracteres)
- Imagens de capa opcionais (gradient placeholders se não houver) com `aspect-[16/9]`
- Animações suaves de entrada (Framer Motion, padrão minimalist do projeto)

---

## Detalhes técnicos

- **Tipo `BlogPost`**: `{ slug, title, description, keywords[], publishedAt, updatedAt, readingMinutes, author, coverImage?, tags[], summary[], blocks: Block[], faq: {q, a}[], related: slug[] }`
- **`Block` discriminated union**: `paragraph | heading | list | quote | callout | cta | image | code` — cada um com renderer próprio
- **SEO por post**: `react-helmet-async` (adicionar dependência) injeta `<title>`, `<meta description>`, OG tags, JSON-LD `Article` e `FAQPage`
- **Sitemap estático**: gerar `public/sitemap.xml` listando `/`, `/blog`, cada post e páginas legais. `robots.txt` referencia
- **Reading time**: calculado em build a partir do número de palavras dos blocks (não hardcoded)
- **Analytics**: rastrear `blog_post_view` e `blog_cta_click` via `analytics.ts` existente (PostHog)

---

## O que NÃO faz parte deste plano

- CMS dinâmico (Supabase blog_posts table) — descartado, ficou Opção 1
- Comentários, likes, newsletter inline
- Tradução EN
- Página de Termos de Uso (linkar como placeholder no Footer; criar em momento separado se quiser)

---

## Entregáveis

1. 3 rotas novas funcionando (`/blog`, `/blog/:slug`, `/politica-de-cookies`)
2. 5 posts publicados, com keywords destacadas, FAQ, CTA e schema
3. Footer atualizado com links reais
4. Banner de cookies linkando pra nova política
5. Sitemap + meta tags GEO-friendly em todos os posts
6. Sistema documentado (interface tipada) pra você ou eu adicionar post #6 em ~10 minutos depois
