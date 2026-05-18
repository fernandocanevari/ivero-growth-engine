## Contexto

O `SimuladorPage` já renderiza um bloco básico de "Fontes citadas" para os resultados do Gemini Search (Gemini 2.5 com grounding), mostrando título + link. Vamos transformá-lo num bloco **detalhado, executivo e escaneável**, alinhado ao tom B2B do Ivero.

## O que muda (somente UI / presentation)

Arquivo único: `src/pages/dashboard/SimuladorPage.tsx`

### 1. Cabeçalho do bloco
- Manter ícone `Globe` + título "Fontes citadas (N)" + badge "Grounding em tempo real".
- Adicionar subtítulo curto: *"Páginas que o Gemini 2.5 consultou em tempo real para responder."*
- Adicionar badge extra com contagem de **domínios únicos** (ex: "5 domínios").

### 2. Card por fonte (substitui `<li>` simples)
Cada citação vira um mini-card com:
- **Índice** `[1]` em mono, destacado à esquerda.
- **Favicon** do domínio (`https://www.google.com/s2/favicons?domain=<host>&sz=32`) com fallback para ícone `Globe`.
- **Título** da fonte (line-clamp-2, peso medium).
- **Domínio** extraído do URI (ex: `g1.globo.com`) em text-xs muted.
- **Badge "Menciona {brandName}"** verde quando título OU domínio contém a marca (match case-insensitive) — destaca para o executivo qual fonte cita ele.
- Link `ExternalLink` no canto direito abrindo em nova aba.
- Hover: leve `bg-secondary/40` e borda primary/20.

### 3. Agrupamento / ordenação
- Ordenar: primeiro as que mencionam a marca, depois o restante.
- Sem agrupamento por domínio (mantém ordem do Gemini), mas exibir contagem "X de N fontes mencionam {brandName}" acima da lista quando houver matches.

### 4. Estado vazio / sem grounding
- Quando `r.model === "Gemini Search"` e `citations` vazio/undefined: mostrar nota discreta "Gemini 2.5 não retornou fontes para esta resposta." (hoje fica oculto silenciosamente).

### 5. Helpers locais (no mesmo arquivo)
```ts
const getHost = (uri: string) => { try { return new URL(uri).hostname.replace(/^www\./,''); } catch { return uri; } };
const mentionsInSource = (c: Citation, brand: string) =>
  c.title.toLowerCase().includes(brand.toLowerCase()) ||
  c.uri.toLowerCase().includes(brand.toLowerCase());
```

## Fora de escopo
- Não muda a Edge Function `simulate-ai` nem o shape de `citations` (já vem `{ title, uri }`).
- Não muda `PromptTesterPage` nem `PreviewPage`.
- Sem novas libs.

## Detalhes técnicos
- Tokens semânticos do design system (`bg-secondary`, `border-border`, `text-primary`, `text-muted-foreground`) — sem cores hardcoded.
- Favicon usa `<img>` com `onError` trocando para ícone Lucide.
- Tudo client-side, zero impacto em dados/RLS.
