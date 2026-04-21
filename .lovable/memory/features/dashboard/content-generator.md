---
name: Gerador de Conteúdo Estratégico GEO
description: Recurso premium em /dashboard/conteudo que gera Artigo + FAQ + Resumo otimizados para citação por IAs, com cota de 2 gerações no trial
type: feature
---

Localização: `/dashboard/conteudo` (item "Gerador de Conteúdo", ícone `PenLine`, grupo **Ações**, logo após "Planos de Ação"). Página: `src/pages/dashboard/GeradorConteudoPage.tsx`.

Edge function `supabase/functions/generate-content/index.ts` faz tudo no servidor: valida JWT, lê `brand_settings` + último `analysis_history` via service role para enriquecer contexto, chama Lovable AI Gateway (`google/gemini-3-flash-preview` por padrão) com tool calling forçado em `save_generated_content` para retornar `{ article_md, faq[], summary_md }` estruturado, persiste em `generated_content`. Trata 429/402 com mensagens claras. **Prompt do sistema fica só na edge function — nunca no client.**

Cota de trial: `TRIAL_GENERATION_LIMIT = 2` em `src/lib/access-control.ts`. Hook `useGenerationQuota()` faz `count` em `generated_content` do usuário. Admins e usuários pagos: ilimitado. Cota é checada no client (UX) **e** revalidada no edge (segurança — retorna 403 com `error: "trial_quota_exceeded"`).

A rota `/dashboard/conteudo` está em `TRIAL_ALLOWED_ROUTES` — usuário em trial acessa a página, mas o botão "Gerar" abre `UpgradeModal` quando `quota.exhausted`. Diferente das outras rotas premium (que mostram TrialLockedPage). Razão: o Gerador é gancho de conversão — tem que ser clicável, demonstrar valor, e só travar no momento da ação.

Tabela `generated_content` (RLS: own + admin view):
`id, user_id, topic, tone, formats[], context_used jsonb, article_md, faq_json jsonb, summary_md, model_used, created_at`. Index em `(user_id, created_at DESC)` para histórico rápido.

Hooks:
- `useGenerateContent()` — mutation que invoca edge, atualiza cache de `content_history` + `generation_quota`.
- `useContentHistory()` — últimos 20 conteúdos do usuário.
- `useDeleteGeneratedContent()` — delete via RLS própria.
- `useGenerationQuota()` — `{used, limit, remaining, unlimited, exhausted}`.

Exportação client-side em `src/lib/content-export.ts`: `.md` (Blob direto, sem deps) e `.docx` (`docx` lib + parser leve via `marked`). Botão "Copiar" por aba (Artigo / FAQ / Resumo) usa `navigator.clipboard`.

Tracking PostHog: `content_generation_attempt` (result: success|error|blocked_quota), `content_generation_blocked_by_quota`, `content_export` (format: md|docx|clipboard).

Fora do escopo (fase 2 quando justificado): publicação direta WordPress/CMS, geração de imagens de capa, agendamento/calendário editorial, links de checkout dentro de respostas de IA (descartado por desalinhamento estratégico — Ivero é B2B de auditoria, não D2C).
