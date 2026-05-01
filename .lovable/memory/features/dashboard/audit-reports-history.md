---
name: Audit Reports History
description: Histórico navegável de auditorias com snapshots completos persistidos em audit_reports
type: feature
---

`/dashboard/auditorias` lista cronologicamente todos os relatórios de auditoria do usuário (desc por data). Cada item mostra score, faixa (Crítico/Insuficiente/Moderado/Sólido/Referência), delta vs. anterior, site_url e source. Click → `/dashboard/auditorias/:id` reabre o `DiagnosticoPage` em modo `readOnly` com `snapshotOverride` carregado do banco.

**Tabela `audit_reports`** (snapshot completo, separada de `analysis_history` que só guarda os 6 scores p/ chart de evolução):
- Campos: site_url, source ('preview'|'reanalise'), overall_score, status_label, radar_data, pillar_details, keyword_cloud, ai_engines
- RLS: usuário vê/insere/deleta os próprios; admin vê todos. Sem UPDATE (snapshots imutáveis).
- Índice em (user_id, created_at DESC).

**Pontos de gravação:**
1. `PreviewPage` — após simulate-ai, se `auth.uid()` existe, insere com source='preview' (em paralelo ao sessionStorage).
2. `DiagnosticoPage.handleReanalyze` — onSuccess insere com source='reanalise' usando livePillars/liveRadar/liveScore correntes.
3. `useAdoptPendingAudit` (chamado no `DashboardLayout`) — adopta sessionStorage para usuários que vieram de /preview anônimo, signaram, e não têm audit_reports ainda. Marca `ivero:audit_adopted=1` para não duplicar.

**Refactor leve no `DiagnosticoPage`:** props opcionais `snapshotOverride` e `readOnly`. Em readOnly oculta botão re-análise, comparativo de deltas e gráfico de evolução. Sem readOnly mantém comportamento original (lê sessionStorage como fallback).

Sidebar: item "Auditorias" no grupo "Visão Geral" (ícone `History`, posicionado entre Diagnóstico e Evolução). Liberado em trial.
