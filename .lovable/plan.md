# Prompt 1 de 4 — Estrutura da página LLMs.txt

Esta é a fundação visual da feature. Os 3 módulos (Diagnóstico, Gerador, Monitoramento) ficam como abas vazias por enquanto — serão implementados nos prompts 2, 3 e 4.

## O que será criado

### 1. Item no sidebar (`DashboardSidebar.tsx`)
- Grupo **Inteligência**, logo após **Simulador de Influência**
- Título: `LLMs.txt`
- Ícone: `FileCode` (lucide-react)
- URL: `/dashboard/llms-txt`
- Como é feature paga, herda automaticamente o cadeado no trial (já tratado por `isRouteAllowedInTrial`) — vou adicionar a rota à lista de rotas pagas em `src/lib/access-control.ts`.

### 2. Rota (`App.tsx`)
- `path="llms-txt"` dentro do `DashboardLayout`, apontando para `LlmsTxtPage`.

### 3. Página `src/pages/dashboard/LlmsTxtPage.tsx`
Layout:

```text
┌─────────────────────────────────────────────┐
│ LLMs.txt                                    │  ← 24px, font-medium
│ Gere, diagnostique e monitore... [i]        │  ← 14px muted + tooltip
├─────────────────────────────────────────────┤
│ Diagnóstico   Gerador   Monitoramento       │  ← underline tabs
│ ─────────                                   │  ← active underline (primary)
├─────────────────────────────────────────────┤
│ [conteúdo da aba ativa]                     │
└─────────────────────────────────────────────┘
```

Detalhes:
- **Header**: `<h1>` 24px (`text-2xl font-medium`), subtítulo `text-sm text-muted-foreground` com `<InfoTooltip>` ao lado contendo o texto especificado.
- **Tabs**: shadcn `Tabs` com `TabsList` customizado para estilo underline (sem fundo pill). Aba ativa: texto `text-primary`, underline 2px `bg-primary`; inativas: `text-muted-foreground`, sem underline; hover sutil.
- **Transição**: cada `TabsContent` envolto em `framer-motion` `AnimatePresence` com fade 150ms.
- **Default**: `defaultValue="diagnostico"`.
- **Placeholder de cada aba**: `EmptyStateCard` discreto com mensagem tipo "Em construção — disponível em breve" (substituído nos próximos prompts).
- **SEO**: `useEffect` setando `document.title` e meta description via helper `seo.ts`.

### 4. Memória do projeto
Atualizar `mem://index.md` adicionando referência à nova feature para os próximos prompts manterem contexto.

## Fora de escopo deste prompt
- Lógica de scraping / Firecrawl (Prompt 2)
- Geração de markdown llms.txt (Prompt 3)
- Cron semanal + alertas (Prompt 4)
- Tabelas no banco — só serão criadas quando o módulo correspondente precisar.

## Aprovação
Confirma para eu implementar a estrutura? Depois você cola o **Prompt 2 de 4 (Diagnóstico)**.
