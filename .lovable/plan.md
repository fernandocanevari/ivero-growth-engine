
# Roadmap de Implementação — Ivero

## Status dos Módulos

### ✅ Concluídos
- [x] Autenticação (login/cadastro com Supabase Auth)
- [x] Onboarding Diagnóstico (3 perguntas estratégicas)
- [x] Configurações da Marca (brand_settings no Supabase)
- [x] Campanhas (CRUD no Supabase)
- [x] Painel Admin (4 camadas: Negócio, Produto, Estratégica, Risco)
- [x] Estados vazios em todas as páginas (progressivo conforme dados)

### 🔲 Próximos — 9 Recursos Core da Ivero

Cada item abaixo precisa de backend real (edge functions + tabelas) para substituir os mocks.

#### 1. Simulador de Influência em IA
- **Status:** 🔲 Pendente (primeiro a implementar)
- **O que falta:** Edge function que consulta APIs de IA (OpenAI, Gemini, Perplexity, Claude) em tempo real
- **Tabelas:** `simulation_results` (histórico de simulações)
- **Página:** `/dashboard/simulador`

#### 2. Prompt Tester
- **Status:** 🔲 Pendente
- **O que falta:** Edge function similar ao Simulador, mas focada em teste rápido de presença
- **Tabelas:** `prompt_tests` (histórico de testes)
- **Página:** `/dashboard/prompt-tester`

#### 3. Monitoramento Multi-IA (Menções)
- **Status:** 🔲 Pendente
- **O que falta:** Edge function com cron job para coletar menções periodicamente
- **Tabelas:** `mentions` (menções por modelo, data, contexto)
- **Flag no Dashboard:** `hasMonitoringData`
- **Página:** `/dashboard/monitoramento`

#### 4. Score de Visibilidade GEO
- **Status:** 🔲 Pendente
- **O que falta:** Algoritmo de scoring baseado em menções, sentimento e posição
- **Tabelas:** `geo_scores` (score histórico por período)
- **Flag no Dashboard:** `hasScoreData`
- **Página:** `/dashboard/score`

#### 5. Análise de Sentimento
- **Status:** 🔲 Pendente
- **O que falta:** Classificação de sentimento (positivo/neutro/negativo) via IA
- **Tabelas:** `sentiment_analysis` (sentimento por menção)
- **Flag no Dashboard:** `hasSentimentData`
- **Página:** `/dashboard/sentimento`

#### 6. Análise Comparativa
- **Status:** 🔲 Pendente
- **O que falta:** Coleta de menções do concorrente para comparação
- **Depende de:** Monitoramento (#3) implementado
- **Flag no Dashboard:** `hasMonitoringData && hasCompetitor`
- **Página:** `/dashboard/comparativo`

#### 7. Dominância por Modelo
- **Status:** 🔲 Pendente
- **O que falta:** Cálculo de share of voice por modelo de IA
- **Depende de:** Monitoramento (#3) implementado
- **Página:** `/dashboard/dominancia`

#### 8. Alertas em Tempo Real
- **Status:** 🔲 Pendente
- **O que falta:** Sistema de detecção de mudanças significativas (queda de score, nova menção negativa, etc.)
- **Tabelas:** `alerts` (alertas gerados automaticamente)
- **Flag no Dashboard:** `hasAlerts`
- **Página:** `/dashboard/alertas`

#### 9. Planos de Ação
- **Status:** 🔲 Pendente
- **O que falta:** Motor de recomendações baseado nos dados coletados
- **Tabelas:** `actions` (ações sugeridas por cliente)
- **Flag no Dashboard:** `hasActions`
- **Página:** `/dashboard/acoes`

### 📊 Outros pendentes
- [ ] Mapa de Prompts Estratégicos (tabela `strategic_prompts`, flag `hasPrompts`)
- [ ] Relatórios exportáveis (PDF/CSV com dados reais)

---

## Ordem Recomendada de Implementação

```
1. Simulador de Influência ← primeiro recurso funcional
2. Prompt Tester ← reutiliza infra do Simulador
3. Monitoramento Multi-IA ← coleta automatizada
4. Score GEO ← depende do Monitoramento
5. Análise de Sentimento ← depende do Monitoramento
6. Análise Comparativa ← depende do Monitoramento
7. Dominância por Modelo ← depende do Monitoramento
8. Alertas em Tempo Real ← depende de Score + Sentimento
9. Planos de Ação ← depende de todos os anteriores
```

## Notas Técnicas

- Cada módulo implementado deve trocar o flag `false` correspondente no `DashboardOverview.tsx` por uma query real
- APIs de IA necessárias: OpenAI, Gemini, Perplexity, Claude (secrets a configurar)
- Edge functions serão deployadas automaticamente pelo Lovable
