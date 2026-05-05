## Sistema Comercial — Plano consolidado

Construir um funil comercial integrado ao diagnóstico atual, com proposta gerada automaticamente, links públicos rastreáveis e CRM completo no admin.

---

### 1. Banco de dados (Supabase)

**Nova tabela `propostas`:**

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `slug` | text UNIQUE | URL pública curta |
| `empresa_nome` | text | |
| `empresa_site` | text | |
| `contato_nome` / `contato_email` / `contato_telefone` | text nullable | |
| `origem` | enum | `preview` \| `convite` |
| `diagnostico_snapshot` | jsonb | cópia completa do diagnóstico (pillars, score, radar, keywords, ai_engines) |
| `score_geral` | int | denormalizado para filtros |
| `plano_sugerido` | enum | `presenca` \| `influencia` \| `autoridade` \| `dominio` |
| `valor_proposto` | numeric | calculado pela faixa de score |
| `valor_negociado` | numeric nullable | editado pelo admin |
| `status` | enum | `enviada` \| `visualizada` \| `em_negociacao` \| `aceita` \| `recusada` \| `expirada` |
| `motivo_recusa_categoria` | enum nullable | `preco` \| `momento` \| `concorrente` \| `sem_fit` \| `sem_resposta` \| `outro` |
| `motivo_recusa_texto` | text nullable | |
| `notas_admin` | text | privado |
| `viewed_at` / `responded_at` / `expires_at` | timestamptz | `expires_at = created_at + 7 dias` |
| `created_by` | uuid nullable | admin que criou (quando convite) |
| `created_at` / `updated_at` | timestamptz | trigger `update_updated_at_column` |

**RLS:**
- `SELECT`: apenas admin (`has_role(auth.uid(),'admin')`).
- `INSERT/UPDATE/DELETE`: apenas admin.
- Acesso público é feito **somente via edge functions** com service role — nunca direto do browser.

**Trigger:** reaproveita `update_updated_at_column()` existente.

---

### 2. Edge Functions (3 novas)

**`gerar-proposta-from-preview`** (público)
- Input: `audit_report_id` ou snapshot completo + dados de contato opcionais.
- Calcula `plano_sugerido` e `valor_proposto` via `pricing-rules.ts` (faixas de score reusando valores da landing).
- Insere em `propostas`, retorna `slug`.

**`get-proposta-public`** (público)
- Input: `slug`.
- Busca, valida `expires_at` (se vencido → marca `expirada`), marca `visualizada` + `viewed_at` na primeira leitura.
- Sanitiza resposta: remove `valor_negociado`, `notas_admin`, `motivo_recusa_*`, `created_by`.

**`responder-proposta`** (público)
- Input: `slug`, `acao` (`aceita` | `recusada`), opcional `motivo_categoria` + `motivo_texto`.
- Valida `expires_at` e estado atual; bloqueia transições inválidas.
- Atualiza status + `responded_at`.

Todas com CORS, validação Zod, sem JWT (públicas).

---

### 3. Frontend — Páginas e fluxos

**A. CTA no `/preview` (PreviewPage.tsx — edição)**
- Card final "Receber proposta personalizada" abaixo da tabela de pontuação.
- Ao clicar: chama `gerar-proposta-from-preview` com o snapshot atual → redireciona para `/propostacomercial/:slug`.
- Sem capturar dados extras (já anônimo); contato fica vazio até aceitação.

**B. `/propostacomercial/:slug` (nova — pública)**
Tema premium light (segue `mem://style/preview-page-theme`):
1. Hero: nome da empresa + score atual + veredito.
2. Resumo do diagnóstico (3-4 pilares em destaque, sem repetir tudo).
3. Plano recomendado com valor e o que inclui.
4. Selo "Proposta válida até DD/MM" (urgência sutil).
5. Dois CTAs:
   - **"Quero começar"** → `/auth?intent=proposta&slug=...` (cadastro com plano pré-selecionado).
   - **"Não tenho interesse"** → modal com motivo (select controlado + textarea opcional) → `responder-proposta`.

**C. `/convite/:slug` (nova — pública, outbound)**
- Mesma estrutura visual da proposta, mas com tom "convite personalizado de Ivero AI".
- Auditoria já está pré-gerada no snapshot (criada no admin antes do envio).
- Mesmos dois CTAs.

**D. `/auth?intent=proposta&slug=...`**
- Após signup, lê query params, marca proposta como `aceita` e armazena slug em sessionStorage para o onboarding pré-selecionar o plano.

---

### 4. Admin — duas páginas novas

**`/dashboard/admin/convites`** (formulário de criação)
- Lista convites com status: **gerando auditoria** / **pronto** / **enviado** / **visualizado** / **respondido**.
- Botão "Novo convite": form com nome da empresa + site + contato opcional.
  - Dispara `simulate-ai` em background → ao concluir, salva snapshot e gera slug.
  - UI mostra progresso e link copiável quando pronto.

**`/dashboard/admin/propostas`** (CRM)
- Tabela com: empresa, score, plano, valor proposto/negociado (edição inline), status (badge + dropdown), origem, dias até expirar.
- Filtros: status, origem, faixa de valor, busca.
- Métricas no topo: total enviadas, taxa de visualização, taxa de aceitação, ticket médio, tempo médio até resposta.
- Mapa de objeções: gráfico de barras agrupando `motivo_recusa_categoria`.
- Drawer de detalhe: snapshot completo + histórico + notas admin.

**Sidebar:** novo item "Propostas" e "Convites" abaixo de "Leads" no `DashboardSidebar.tsx`.

---

### 5. Lógica de preço (reaproveita landing)

`src/lib/pricing-rules.ts`:
```text
score < 40  → presenca   (valor da landing)
40 ≤ s < 60 → influencia
60 ≤ s < 80 → autoridade
s ≥ 80      → dominio
```
Valores importados de uma constante única já usada no `PricingSection`.

---

### 6. Arquivos

**Novos (13):**
- `supabase/functions/gerar-proposta-from-preview/index.ts`
- `supabase/functions/get-proposta-public/index.ts`
- `supabase/functions/responder-proposta/index.ts`
- `src/pages/PropostaComercialPage.tsx`
- `src/pages/ConvitePage.tsx`
- `src/pages/AdminPropostasPage.tsx`
- `src/pages/AdminConvitesPage.tsx`
- `src/components/proposta/PropostaHero.tsx`
- `src/components/proposta/PropostaPlano.tsx`
- `src/components/proposta/RecusaModal.tsx`
- `src/components/admin/PropostaInlineEdit.tsx`
- `src/lib/pricing-rules.ts`
- `src/hooks/usePropostas.ts`

**Editados (5):**
- `src/App.tsx` — 4 rotas novas
- `src/pages/PreviewPage.tsx` — CTA + chamada à edge function
- `src/pages/AuthPage.tsx` — handler `intent=proposta`
- `src/components/dashboard/DashboardSidebar.tsx` — 2 itens
- `supabase/migrations/...` — tabela `propostas` + enums + RLS

---

### 7. Não quebra o que existe

- Rotas novas, não conflitam com nenhuma existente.
- `PreviewPage` recebe **apenas** uma seção adicional ao final, sem mexer no fluxo atual.
- Admin segue exatamente o padrão de `AdminLeadsPage`.
- Tabela isolada — nenhuma FK para `audit_reports` (snapshot é a fonte de verdade comercial).
- Memory `proposta-comercial-funil` será atualizada ao final.

---

### 8. Ordem de execução

1. Migration (tabela + enums + RLS + trigger).
2. `pricing-rules.ts` + 3 edge functions.
3. `PropostaComercialPage` + `ConvitePage` + componentes.
4. CTA no `/preview` + integração no `/auth`.
5. `AdminConvitesPage` (com geração de auditoria em background).
6. `AdminPropostasPage` (CRM completo).
7. Sidebar + memory update.

Posso seguir?