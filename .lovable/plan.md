

## Gerador de Conteúdo Estratégico GEO

Recurso premium dentro do dashboard que produz **Artigo + Bloco FAQ + Resumo Executivo** condicionados pelo diagnóstico da marca, com biblioteca interna de versões e exportação.

### Decisões de produto (com base nas suas respostas)

- **Acesso:** trial libera **até 2 gerações** (cota por `user_id`). A partir da 3ª, abre `UpgradeModal`.
- **Escopo por geração:** 1 clique produz 3 entregáveis (Artigo ~800-1200 palavras, Bloco FAQ schema-ready com 5-7 Q&A, Resumo executivo ~200 palavras).
- **Origem da pauta:** campo livre + painel lateral com contexto do diagnóstico (pilares fracos, prompts onde a marca não aparece, concorrente principal) que o usuário pode marcar/desmarcar para entrar no prompt.
- **Publicação:** sem integração externa. Histórico interno + exportação `.md` e `.docx`. Cópia direta para clipboard em cada bloco.

### Onde vive no dashboard

Nova rota `/dashboard/conteudo`, item **"Gerador de Conteúdo"** (ícone `PenLine`) no grupo **Ações**, posicionado logo após "Planos de Ação" — encadeia naturalmente: diagnóstico → ação → conteúdo que executa a ação.

```text
Ações
  ├─ Planos de Ação
  ├─ Gerador de Conteúdo   ← novo (lock no trial após 2 usos)
  ├─ Mapa de Prompts
  ├─ Alertas
  └─ Campanhas
```

### Layout da página

```text
┌──────────────────────────────────────────────────────────────────┐
│ Gerador de Conteúdo Estratégico GEO              [2/2 no trial] │
│ Crie artigos otimizados para serem citados pelas IAs            │
├────────────────────────────────┬─────────────────────────────────┤
│  TEMA                          │  CONTEXTO DO DIAGNÓSTICO        │
│  [textarea: sobre o que...]    │  ☑ Pilar fraco: Autoridade (38) │
│                                │  ☑ Concorrente: Acme            │
│  FORMATO                       │  ☐ Prompt sem menção: "melhor X"│
│  ☑ Artigo  ☑ FAQ  ☑ Resumo     │  ☑ Setor: SaaS B2B              │
│                                │                                 │
│  TOM                           │  Esses dados ajustam o conteúdo │
│  [Executivo ▾]                 │  para fechar lacunas reais.     │
│                                │                                 │
│       [Gerar Conteúdo →]       │                                 │
└────────────────────────────────┴─────────────────────────────────┘

Após geração:
┌──────────────────────────────────────────────────────────────────┐
│ [Tabs: Artigo | FAQ | Resumo]                                    │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Markdown renderizado + ações: Copiar | Baixar .md | .docx   ││
│ └──────────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────┤
│ HISTÓRICO (últimas 20 gerações)                                  │
│ • "Como escolher CRM para PMEs"  · há 2h     [Abrir] [Excluir]  │
│ • "ROI de automação fiscal"      · ontem     [Abrir] [Excluir]  │
└──────────────────────────────────────────────────────────────────┘
```

### Arquitetura técnica

**1. Edge function `generate-content`**
- Lê `client_onboarding`, último `analysis_history` e `brand_settings` do usuário (via service role + verificação de JWT).
- Aplica system prompt especializado em GEO (estrutura H2/H3 escaneável, citação de dados, definições explícitas, FAQ em formato schema.org, evita primeira pessoa promocional).
- Usa **Lovable AI Gateway** (`google/gemini-3-flash-preview` por padrão, configurável). Tool calling para retornar JSON estruturado `{ article, faq[], summary }` em uma chamada.
- Trata 429/402 e devolve mensagens claras.

**2. Tabela nova `generated_content`**

```text
id              uuid PK
user_id         uuid (RLS: own)
topic           text
tone            text
formats         text[]            -- ['article','faq','summary']
context_used    jsonb             -- snapshot do que foi marcado
article_md      text
faq_json        jsonb
summary_md      text
model_used      text
created_at      timestamptz
```

RLS: usuário vê/insere/deleta só o próprio; admin vê tudo (mesmo padrão das outras tabelas).

**3. Cota de trial**
- `useGenerationQuota()` faz `count` em `generated_content` do usuário no trial.
- `TRIAL_GENERATION_LIMIT = 2` em `access-control.ts`.
- Botão "Gerar" desabilita ao atingir; abre `UpgradeModal`.
- Admin e usuários pagos: ilimitado.
- Tracking `track('content_generation_attempt', {result, format, has_context})` e `track('content_generation_blocked_by_quota')` — segue padrão dos eventos já adicionados em billing.

**4. Hook `useGenerateContent()`**
- Mutation via `supabase.functions.invoke('generate-content', { body })`.
- Persiste resultado e atualiza cache da query do histórico.

**5. Exportação**
- `.md`: `Blob` direto no client, sem dependência nova.
- `.docx`: `docx` lib (já no padrão do skill) gera client-side com Heading 1/2/3 e bullets a partir do markdown (parser leve com `marked` que provavelmente já está no projeto; senão adiciono).

### Bloqueio no trial (consistência com `access-control.ts`)

Não bloqueio a rota inteira — o **uso** é que tem cota. Diferença importante:
- Sidebar mostra o item sem ícone de lock (acessível).
- Página renderiza normalmente, mas o CTA "Gerar" mostra `[2/2 no trial usadas]` quando esgota e abre upgrade.
- Após expirar o trial (post-7-dias), aí sim entra no fluxo padrão da `TrialLockedPage` (rota não está em `TRIAL_ALLOWED_ROUTES`).

Adiciono nota em `LOCKED_ROUTE_INFO` para `/dashboard/conteudo` com copy específica.

### Prompt do sistema (resumo)

```text
Você é um estrategista de GEO (Generative Engine Optimization).
Produz conteúdo desenhado para ser CITADO por IAs (ChatGPT, Gemini,
Perplexity, Claude). Regras:
- H2/H3 escaneáveis com perguntas explícitas
- Definições diretas no primeiro parágrafo de cada seção
- Dados, números, comparativos sempre que possível
- FAQ em pares pergunta-resposta autocontidos (cada resposta < 80 palavras)
- Sem hype, sem "nós oferecemos", sem CTAs comerciais
- Considera o diagnóstico da marca {context_json} para fechar
  lacunas específicas dos pilares fracos.
```

Prompt **não fica no client**. Fica na edge function.

### Arquivos afetados / criados

**Novos:**
- `supabase/functions/generate-content/index.ts`
- `src/pages/dashboard/GeradorConteudoPage.tsx`
- `src/hooks/useGenerateContent.ts`
- `src/hooks/useContentHistory.ts`
- `src/hooks/useGenerationQuota.ts`
- `src/lib/content-export.ts` (md + docx)
- Migração SQL: tabela `generated_content` + RLS
- `mem://features/dashboard/content-generator` (memory)

**Editados:**
- `src/components/dashboard/DashboardSidebar.tsx` — novo item em Ações
- `src/App.tsx` — rota `conteudo`
- `src/lib/access-control.ts` — `LOCKED_ROUTE_INFO['/dashboard/conteudo']` + constante `TRIAL_GENERATION_LIMIT`
- `mem://index.md` — referência ao novo memory

### Fora do escopo

- Publicação direta em WordPress.com/CMS (sugiro fase 2 quando tivermos demanda real).
- Geração de imagens de capa (fase 2, custo/latência maior).
- Agendamento e calendário editorial (vira feature própria depois).
- Integração com checkout/links de compra dentro de respostas de IA — descartado pelos motivos discutidos.

