## Histórico navegável de auditorias

### O problema que isso resolve

Hoje o `DiagnosticoPage` mostra o relatório completo lendo de `sessionStorage`. Quando o cliente fecha o navegador, todo o detalhe (radar, justificativas, pontos fortes/fracos, critérios, nuvem de keywords) **desaparece** — só sobram os 6 números no `analysis_history` que alimentam o gráfico de evolução. E cada nova análise sobrescreve a anterior, então não dá pra comparar "como meu relatório de março era diferente do de abril".

### O que será construído

**1. Nova tabela `audit_reports` no Supabase** — guarda o snapshot completo de cada auditoria:

```text
id, user_id, created_at, source ('preview' | 'reanalise')
overall_score, status_label
radar_data        (jsonb — 5 pilares com value)
pillar_details    (jsonb — array com nome, score, justificativa, critérios, strengths, weaknesses, recommendation)
keyword_cloud     (jsonb)
ai_engines        (jsonb — quais modelos responderam, com quais scores)
site_url          (text — pra distinguir auditorias de sites diferentes no futuro)
```

RLS: usuário vê só os próprios; admin vê tudo (mesmo padrão das outras tabelas).

**2. Salvar o snapshot em 3 momentos:**
- Quando a `PreviewPage` termina e o usuário está logado → grava direto no banco.
- Quando o `DiagnosticoPage` roda re-análise → grava novo snapshot (não sobrescreve).
- Adoção pós-signup: se um lead anônimo rodou o `/preview`, o payload no `sessionStorage` é "adotado" e gravado no banco no primeiro acesso autenticado.

**3. Nova página `/dashboard/auditorias`** — lista cronológica das auditorias:

```text
┌──────────────────────────────────────────────────────────┐
│ Histórico de Auditorias                                  │
├──────────────────────────────────────────────────────────┤
│ 📊 12 abr 2026 · voeazul.com.br · Score 72 · Sólido  →  │
│ 📊 12 mar 2026 · voeazul.com.br · Score 68 · Moderado→  │
│ 📊 09 fev 2026 · voeazul.com.br · Score 61 · Moderado→  │
└──────────────────────────────────────────────────────────┘
```

Cada linha mostra data, site, score, faixa (Crítico/Insuficiente/Moderado/Sólido/Referência) e delta vs. anterior (▲ +4 / ▼ -2). Click reabre o relatório completo daquela data.

**4. Nova página `/dashboard/auditorias/:id`** — reusa o componente do `DiagnosticoPage` hidratado com o snapshot daquele ID específico, em vez do `sessionStorage`. Mostra um chip "Auditoria de 12/mar/2026" no topo + botão "Voltar para histórico".

**5. Refactor leve no `DiagnosticoPage` atual** — ele continua sendo o "último relatório" (default), mas a fonte de dados passa a ser:
   1º: snapshot mais recente de `audit_reports` (banco)  
   2º: fallback para `sessionStorage` (sessão atual)  
   3º: fallback para mock (nunca rodou nada)

**6. Sidebar** — adicionar item "Auditorias" no grupo "Visão Geral" com ícone `History`, posicionado logo após "Diagnóstico IA". Liberado em trial (mesma lógica do Diagnóstico).

### O que NÃO entra neste escopo

- Status assíncronos "em fila / em análise" — a análise continua sendo síncrona de ~7s. Status só faz sentido com fila real (Inngest), que é outro projeto.
- Comparar dois snapshots lado a lado — pode vir depois.
- Auditar múltiplos sites por usuário — a tabela já tem `site_url` previsto, mas a UI ainda assume 1 site por usuário.

### Detalhes técnicos

- **Migração**: criar `audit_reports` com índice em `(user_id, created_at DESC)` para listagem rápida.
- **Hook novo `useAuditReports`**: `list()`, `get(id)`, `create(payload)`. Substitui parcialmente o uso de `sessionStorage` no `DiagnosticoPage`.
- **`PreviewPage`**: após gerar o payload, se `auth.uid()` existe, chama `useAuditReports.create()` em paralelo ao `sessionStorage.setItem`.
- **Adoção pós-signup**: hook `useAdoptPendingAudit` que roda 1x no `DashboardLayout` após login — se há `sessionStorage("ivero:lastDiagnostic")` e nenhum `audit_report` ainda, faz o insert.
- **`useAnalysisHistory` (existente)**: continua gravando em `analysis_history` para o gráfico de evolução. As duas tabelas convivem — uma é "score ao longo do tempo" (leve, pro chart), outra é "snapshot completo" (pesado, pro relatório navegável).
- **Rota `/dashboard/auditorias/:id`**: protegida pelo `ProtectedRoute` + RLS garante que só o dono lê.

### Resumo visual da arquitetura final

```text
analysis_history     → 6 números × N datas    → gráfico de evolução
audit_reports (NEW)  → snapshot completo × N  → relatórios navegáveis
sessionStorage       → último da sessão atual → fallback offline
```
