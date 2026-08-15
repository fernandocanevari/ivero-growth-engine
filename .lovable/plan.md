# Versão .md da landing page para agentes de IA

Objetivo: servir `/landing.md` (Markdown puro, conteúdo completo) da home da Ivero, linkado discretamente no rodapé, no espírito do usetatu.com — sem alterar a copy atual da landing.

## Estado atual (verificado)

- A landing é um SPA React (`src/pages/Index.tsx`) com 9 seções; **a copy está hardcoded dentro do JSX** de cada componente (`HeroSection`, `ProblemSection`, `StepsSection`, `FeaturesSection`, `CTASection`, `AudienceSection`, `InvestSection`, `FAQSection`).
- Duas seções já têm dados estruturados: `FAQSection` (array `faqs`) e `InvestSection`, que lê preços/highlights de `src/lib/pricing-rules.ts` (fonte única já existente).
- Já existe um plugin Vite de geração de arquivo estático em build + dev (`vite-plugin-sitemap.ts` → `public/sitemap.xml`), registrado em `vite.config.ts`. Mesmo padrão serve para o `.md`.
- `public/robots.txt` libera tudo e aponta o sitemap.

## 1. Como servir — opções e recomendação

**Opção A — Arquivo estático gerado no build por plugin Vite (recomendada).**
Um `vite-plugin-landing-md.ts` monta o Markdown a partir de um módulo de conteúdo e grava `public/landing.md`, exatamente como o plugin de sitemap faz hoje.
- Prós: servido como arquivo estático real (`Content-Type: text/markdown`), zero latência, zero cold start, funciona no preview e em produção, versionado no repo (dá pra revisar o diff), nenhuma dependência nova.
- Contras: exige que a copy viva num módulo de conteúdo compartilhado (refactor mecânico, copy idêntica).

**Opção B — Edge Function que converte o HTML renderizado em Markdown.**
- Contras decisivos: o app é SPA sem SSR, então o HTML servido não contém a copy — a function precisaria de headless browser (indisponível no Deno Edge) ou reimplementar o render. Some cold start, custo por request e risco de divergência silenciosa. Descartada.

**Opção C — Plugin que extrai strings do TSX via regex.**
- Contras: frágil (interpolações, spans aninhados no hero, JSX condicional), quebra em qualquer refactor visual. Descartada.

**Opção D — `.md` escrito à mão em `public/`.**
- Contras: é exatamente o "documento morto" que o pedido quer evitar. Descartada.

Recomendação: **Opção A**, com rota canônica `/landing.md` e alias opcional `/index.md`.

## 2. Como manter sincronizado

A garantia vem de ter **uma única fonte de verdade** para a copy:

1. Criar `src/content/landing.ts` com a copy estruturada (hero, seções, cards, passos, FAQ, planos referenciando `PLANOS` de `pricing-rules.ts` — sem duplicar preço).
2. Os componentes da landing passam a **ler dessa fonte** em vez de ter as strings inline. A copy renderizada não muda um caractere.
3. O plugin Vite gera `public/landing.md` a partir do mesmo módulo, em `buildStart` e em `configureServer` (watch de `src/content/landing.ts`), como o sitemap.
4. Um teste (`landing-md.sync.test.ts`) falha se `public/landing.md` não for igual ao Markdown gerado da fonte atual — trava commit com arquivo desatualizado.
5. Preços/planos entram sempre via `pricing-rules.ts`, então uma mudança de preço se propaga para site e `.md` na mesma edição.

Resultado: mudar a copy da landing sem atualizar o `.md` deixa de ser possível — o build regrava e o teste acusa.

## 3. Link no rodapé

Nova coluna curta ou item na coluna "Empresa" do `Footer.tsx`, mesmo estilo tipográfico dos outros links (mesma cor `text-muted-foreground`, mesmo tamanho — nenhum cloaking, nada oculto):

- Cabeçalho da coluna: **Para IA**
- Link: **Versão em Markdown desta página** → `/landing.md`
- Alternativas de texto: "Ler em Markdown (para agentes de IA)" ou "Conteúdo para agentes de IA (.md)".

Complemento sugerido (opcional, mesma entrega): `<link rel="alternate" type="text/markdown" href="https://ivero.com.br/landing.md">` no `<head>` do `index.html` e uma linha no `robots.txt` — ambos sinais legítimos de descoberta, sem afetar o visual.

## 4. Conteúdo do .md

Estrutura proposta (Markdown puro, sem HTML/CSS, sem resumir):

```text
# Ivero — Auditoria de Influência de Marca em IAs
> Descrição curta (meta description atual)
URL canônica: https://ivero.com.br/

## Sua marca pode estar invisível agora        <- hero (headline + subheadline + CTA)
## As IAs reconhecem sua marca?                <- ProblemSection (3 problemas em lista)
## 3 passos para dominar a IA                  <- StepsSection (passos numerados)
## Recursos                                    <- FeaturesSection (9 cards: título + descrição)
## Por que agora                               <- CTASection (estatísticas + headline)
## Para quem é a Ivero                         <- AudienceSection
## Planos e preços                             <- InvestSection via PLANOS (nome, tagline, mensal/anual, highlights, métricas)
## Perguntas frequentes                        <- FAQSection (### pergunta + resposta)
## Sobre a Ivero / Links                       <- rodapé: tagline, links úteis, contato
---
Última atualização: AAAA-MM-DD · Gerado automaticamente a partir do conteúdo da página.
```

Headers hierárquicos, listas para cards/benefícios, tabela simples só nos planos, texto corrido nas respostas de FAQ.

## Detalhes técnicos

- Novos arquivos: `src/content/landing.ts`, `vite-plugin-landing-md.ts`, `src/lib/landing-md.ts` (serializador puro, testável), `public/landing.md` (gerado), teste de sincronia.
- `vite.config.ts`: registrar o plugin junto de `sitemapPlugin()`.
- Componentes editados apenas para trocar strings inline por leitura do módulo de conteúdo — nenhuma mudança de layout, animação ou copy.
- Servido pelo host estático da Lovable; se o `Content-Type` vier como `application/octet-stream`, a alternativa é publicar como `/landing.md` mesmo assim (agentes leem por extensão) ou expor um espelho em Edge Function apenas se o header virar bloqueio real.
- Escopo desta entrega: somente a home. O mesmo serializador pode depois gerar `/blog/<slug>.md`, já que os posts vivem em `src/content/blog/*` com dados estruturados.
