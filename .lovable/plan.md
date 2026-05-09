## Objetivo

Adicionar um banner persistente no topo do dashboard informando que as análises estão rodando com 3 de 5 modelos de IA (OpenAI, Gemini e GPT-5), enquanto Claude e Perplexity estão em **modo de implementação**.

## O que será criado

**Novo componente** `src/components/dashboard/ModelsStatusBanner.tsx`:
- Banner discreto, full-width, ancorado no topo do `DashboardLayout` (logo abaixo do header, antes do conteúdo da página)
- Visual: faixa âmbar suave (`bg-amber-50 border-amber-200`), ícone `Info` da Lucide, alinhada ao tom Light do dashboard
- Texto: **"Análises rodando com 3 de 5 modelos de IA — Claude e Perplexity estão em modo de implementação. As métricas refletem a média dos modelos ativos (OpenAI, Gemini, GPT-5)."**
- Botão "x" para dispensar na sessão (estado em `sessionStorage`, chave `ivero:models-banner-dismissed`)
- Visível para **todos os usuários logados** no `/dashboard/*` (inclusive admin) — não aparece em landing, preview ou áreas públicas

## Onde será integrado

`src/components/dashboard/DashboardLayout.tsx` — inserir `<ModelsStatusBanner />` imediatamente acima do `<Outlet />` / área de conteúdo, dentro do container principal.

## O que NÃO será mexido

- Edge function `simulate-ai` continua igual (lógica de tolerância a falhas já existe)
- Banner no `PreviewPage` (parcial, dinâmico por análise) permanece como está
- Sem mudanças em schema, secrets, ou rotas

## Como remover quando Claude/Perplexity voltarem

Basta deletar o `<ModelsStatusBanner />` do `DashboardLayout` (ou trocar por uma flag em `src/lib/ai-models-status.ts` que eu posso já criar exportando `MODELS_IN_STANDBY = ["Claude", "Perplexity"]` — assim no futuro é só esvaziar o array para ocultar o banner automaticamente).

## Arquivos afetados

- `src/components/dashboard/ModelsStatusBanner.tsx` (novo)
- `src/lib/ai-models-status.ts` (novo, fonte única dos modelos em standby)
- `src/components/dashboard/DashboardLayout.tsx` (1 import + 1 linha)
