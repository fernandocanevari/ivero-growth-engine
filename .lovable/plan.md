

## Tags de Percepção da IA

Nova página no grupo **Inteligência** que traduz os scores dos 5 pilares (do Radar Estratégico) em tags semânticas verde/amarelo/vermelho — funcionando como evidências da pergunta-mestre: *"Este site tem sinais suficientes para ser recomendado por uma IA?"*

### Decisões de produto

- **Origem dos dados:** última linha de `analysis_history` (mesma fonte do Radar Estratégico, do Diagnóstico IA e da Evolução). Sem nova coleta, sem novo cálculo — só leitura + tradução.
- **Histórico:** mostra também tags das auditorias anteriores (timeline de percepção), porque a tabela já persiste cada audit. **Não há perda ao navegar** — os scores e a perception_snapshot ficam no Postgres com RLS por usuário.
- **Acesso:** rota liberada **só nos planos pagos** (alinhada às demais rotas de Inteligência como Monitoramento/Comparativo/Dominância — *não* entra em `TRIAL_ALLOWED_ROUTES`).
- **Naming:** o pedido cita "Relevância" — usaremos esse rótulo no UI mapeando para a coluna `experience_score` do DB (mesma convenção já adotada em DiagnosticoPage e GeradorConteudoPage).

### Lógica de tags

Cada pilar gera **2 tags** (uma de proposição + uma de impacto) para enriquecer a leitura executiva:

| Score | Cor | Exemplos por pilar |
|---|---|---|
| `> 80` | 🟢 Verde (`emerald-100/700`) | Clareza → "Proposta Clara" + "Mensagem Direta" |
| `50–80` | 🟡 Amarelo (`amber-100/700`) | Posicionamento → "Posicionamento em Evolução" + "Diferenciação Parcial" |
| `< 50` | 🔴 Vermelho (`red-100/700`) | Clareza → "Ruído na Comunicação" + "Mensagem Confusa" |

Banco de tags fica num dicionário tipado (`PERCEPTION_TAGS_BY_PILLAR`) em `src/lib/perception-tags.ts`. Cada pilar tem 3 conjuntos (high/mid/low) com 2 tags cada — total 30 tags estáticas. Função pura `pillarToTags(pillar, score)` retorna `{ tags: string[]; tone: 'green' | 'yellow' | 'red' }`.

### Veredito mestre

Card de destaque no topo responde a pergunta literal:

```text
"Este site tem sinais suficientes para ser recomendado por uma IA?"

[ ✓ SIM, com solidez ]   ← se ≥3 tags verdes e nenhuma vermelha
[ ⚠ PARCIALMENTE ]       ← se 2+ verdes ou 0 vermelhas
[ ✗ INSUFICIENTE ]       ← se 2+ vermelhas ou 0 verdes
```

Regra exposta em `computeVerdict(tagSummary)`.

### Layout da página

```text
┌──────────────────────────────────────────────────────────────────┐
│ Tags de Percepção da IA              [última auditoria · 2d atrás]│
│ Como as IAs leem os sinais do seu site, traduzido em evidências  │
├──────────────────────────────────────────────────────────────────┤
│  VEREDITO                                                         │
│  ✓  SIM, com solidez                                              │
│  Sua marca apresenta sinais suficientes para ser recomendada.    │
│  3 verdes · 1 amarela · 1 vermelha                                │
├──────────────────────────────────────────────────────────────────┤
│  PERCEPÇÕES POR PILAR                                             │
│  ┌─ Clareza ─────── 82 ──┐  ┌─ Autoridade ──── 35 ──┐            │
│  │ 🟢 Proposta Clara     │  │ 🔴 Baixa Autoridade   │            │
│  │ 🟢 Mensagem Direta    │  │ 🔴 Sinais Ausentes    │            │
│  └───────────────────────┘  └───────────────────────┘            │
│  ┌─ Conversão ────── 58 ─┐  ┌─ Posicionamento  64 ─┐            │
│  │ 🟡 Conv. em Evolução  │  │ 🟡 Posic. em Evolução │            │
│  │ 🟡 Atrito Parcial     │  │ 🟡 Diferenciação Par. │            │
│  └───────────────────────┘  └───────────────────────┘            │
│  ┌─ Relevância ───── 71 ─┐                                       │
│  │ 🟡 Relevância Parcial │                                       │
│  │ 🟡 Cobertura Limitada │                                       │
│  └───────────────────────┘                                       │
├──────────────────────────────────────────────────────────────────┤
│  EVOLUÇÃO DA PERCEPÇÃO (últimas 5 auditorias)                    │
│  21/04 ─ 🟢🔴🟡🟡🟡   →  Insuficiente                             │
│  10/03 ─ 🟢🔴🔴🟡🟡   →  Insuficiente                             │
│  09/02 ─ 🟡🔴🔴🟡🔴   →  Insuficiente                             │
└──────────────────────────────────────────────────────────────────┘

Empty state: se não há audit, EmptyStatePage com CTA para Diagnóstico.
```

### Persistência (atende ao pedido de "tabela de audits")

A tabela `analysis_history` **já é a tabela de audits** — cada linha é uma auditoria com os 5 scores. Para que a *percepção exata* (cor + tags exibidas) sobreviva mesmo se as regras de classificação mudarem no futuro, adiciono uma coluna nova:

```sql
ALTER TABLE analysis_history
  ADD COLUMN perception_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
```

Estrutura do snapshot:
```json
{
  "tags": {
    "Clareza":        { "tone": "green",  "labels": ["Proposta Clara", "Mensagem Direta"] },
    "Autoridade":     { "tone": "red",    "labels": ["Baixa Autoridade", "Sinais Ausentes"] },
    "Conversão":      { "tone": "yellow", "labels": ["Conversão em Evolução", "Atrito Parcial"] },
    "Posicionamento": { "tone": "yellow", "labels": ["Posicionamento em Evolução", "Diferenciação Parcial"] },
    "Relevância":     { "tone": "yellow", "labels": ["Relevância Parcial", "Cobertura Limitada"] }
  },
  "verdict": "partial",
  "computed_at": "2026-04-21T12:00:00Z"
}
```

- **Escrita:** `useAnalysisHistory.runAnalysis` calcula o snapshot via `pillarToTags` e grava junto com os scores no mesmo `INSERT`.
- **Backfill em runtime:** linhas antigas com `perception_snapshot = '{}'` são reidratadas na hora pela página (deriva via mesma função pura) — sem migração de dados pesada.
- **RLS:** herda as policies existentes (`Users can view own analysis history`, `Users can insert own analysis`). Nada novo.

### Arquitetura técnica

**Novos arquivos**
- `src/lib/perception-tags.ts` — dicionário de tags + `pillarToTags()` + `computeVerdict()` + tipos `PerceptionTone`, `PerceptionSnapshot`.
- `src/pages/dashboard/TagsPercepcaoPage.tsx` — UI da página (Cards + Badges existentes do shadcn).
- `src/components/dashboard/PerceptionTagBadge.tsx` — Badge tipado por tone (verde/amarelo/vermelho) reutilizável.
- Migração SQL: `ADD COLUMN perception_snapshot jsonb NOT NULL DEFAULT '{}'`.

**Editados**
- `src/components/dashboard/DashboardSidebar.tsx` — novo item **"Tags de Percepção"** (ícone `Tags` do lucide), no grupo Inteligência, posicionado logo após "Score GEO".
- `src/App.tsx` — rota `/dashboard/tags-percepcao` apontando para a nova página.
- `src/lib/access-control.ts` — entrada em `LOCKED_ROUTE_INFO` para a rota (TrialLockedPage com copy específica).
- `src/hooks/useAnalysisHistory.ts` — `runAnalysis` passa a calcular e gravar `perception_snapshot`; tipo `AnalysisRecord` ganha `perception_snapshot?: PerceptionSnapshot`.
- `src/integrations/supabase/types.ts` — regenerado automaticamente pela migração.
- `mem://features/dashboard/perception-tags` (memory novo) + `mem://index.md` (referência).

### Fora do escopo

- Editor manual de tags (são derivadas, não editáveis).
- Notificação/alerta quando uma tag muda de cor (vira feature do módulo Alertas se houver demanda).
- Exportação dedicada das tags em PDF (já entra na exportação geral de Relatórios).
- Tags por modelo individual (ChatGPT/Gemini/etc) — atual escopo é por pilar; granularidade por modelo fica para fase 2.

