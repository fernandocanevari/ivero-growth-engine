

## Painel do Cliente Ivero — Dashboard com Tema Claro

### Filosofia do Dashboard

O painel nao sera um "dashboard cheio de graficos". Sera um painel executivo que responde imediatamente a uma pergunta central:

**"Estou ganhando ou perdendo espaco nas IAs?"**

Estruturado em 3 blocos visuais que respondem:

```text
+------------------------------------------+
|  COMO MINHA MARCA ESTA SENDO PERCEBIDA?  |  Bloco 1: Percepcao
|  Score GEO + Sentimento + Alertas        |
+------------------------------------------+
|  ONDE ESTOU GANHANDO OU PERDENDO?        |  Bloco 2: Posicionamento
|  Monitoramento + Comparativo + Dominancia|
+------------------------------------------+
|  O QUE EU FACO AGORA?                    |  Bloco 3: Acao
|  Plano de Acao + Prompts + Simulador     |
+------------------------------------------+
```

### Estrutura de Rotas

```text
/dashboard                    -> Visao geral (os 3 blocos acima)
/dashboard/monitoramento      -> Monitoramento Multi-IA
/dashboard/comparativo        -> Analise Comparativa
/dashboard/score              -> Score de Visibilidade GEO
/dashboard/sentimento         -> Analise de Sentimento
/dashboard/acoes              -> Planos de Acao Estrategicos
/dashboard/alertas            -> Alertas em Tempo Real
/dashboard/prompts            -> Mapa de Prompts Estrategicos
/dashboard/dominancia         -> Dominancia por Modelo de IA
/dashboard/simulador          -> Simulador de Influencia em IA
/dashboard/campanhas          -> Lista de Campanhas
/dashboard/campanhas/nova     -> Criar Nova Campanha
/dashboard/prompt-tester      -> Prompt Tester
/dashboard/relatorios         -> Relatorios e Exports
/dashboard/configuracoes      -> Configuracoes da conta/marca
```

### Menu Lateral (Sidebar)

Organizado em grupos logicos:

**Visao Geral**
- Dashboard (icone: LayoutDashboard)

**Inteligencia**
- Monitoramento Multi-IA (icone: Radar)
- Analise Comparativa (icone: GitCompare)
- Dominancia por Modelo (icone: BarChart3)
- Score GEO (icone: TrendingUp)
- Analise de Sentimento (icone: Shield)

**Acoes**
- Planos de Acao (icone: FileText)
- Mapa de Prompts (icone: Map)
- Alertas (icone: Bell) com badge de contagem

**Ferramentas**
- Simulador de Influencia (icone: FlaskConical)
- Prompt Tester (icone: Terminal)
- Campanhas (icone: Megaphone)

**Extras sugeridos**
- Relatorios (icone: Download) — exportar PDFs e CSVs com resumo mensal
- Configuracoes (icone: Settings) — gerenciar marca, concorrentes monitorados, notificacoes

### Design: Tema Claro

- Fundo principal: branco (#FFFFFF) com cards em cinza muito claro (#F8F9FC)
- Textos: cinza escuro para leitura confortavel de dados
- Sidebar: fundo branco com borda lateral sutil, icones cinza, item ativo com fundo roxo suave e texto roxo
- Gradiente Ivero (roxo-para-pink) usado apenas em destaques: Score GEO gauge, CTAs, badges importantes
- Sombras suaves em cards, sem bordas pesadas
- Cores semanticas mantidas: verde (bom), amarelo (atencao), vermelho (ruim)

### Pagina Principal — Visao Geral

Nao sera um dashboard generico. Tera 3 secoes com titulos claros:

**Secao 1: "Como sua marca esta sendo percebida?"**
- Card grande com Score GEO (gauge circular) + tendencia (subindo/descendo)
- Mini card de Sentimento (barra positivo/neutro/negativo)
- Ultimos 3 alertas com timestamp

**Secao 2: "Onde voce esta ganhando ou perdendo?"**
- Cards por modelo de IA (ChatGPT, Gemini, Claude, Perplexity) com indicador de tendencia
- Mini comparativo com principal concorrente (barra lado a lado)

**Secao 3: "O que fazer agora?"**
- Top 3 acoes priorizadas com checkbox
- Prompt com maior oportunidade de melhoria
- Botao para acessar o Simulador

### Detalhes Tecnicos

**Arquivos a criar:**

Layout e navegacao:
- `src/components/dashboard/DashboardLayout.tsx` — SidebarProvider + Sidebar + header + Outlet
- `src/components/dashboard/DashboardSidebar.tsx` — Menu lateral com grupos e NavLink

Paginas:
- `src/pages/dashboard/DashboardOverview.tsx` — Visao geral com os 3 blocos
- `src/pages/dashboard/MonitoramentoPage.tsx`
- `src/pages/dashboard/ComparativoPage.tsx`
- `src/pages/dashboard/ScorePage.tsx`
- `src/pages/dashboard/SentimentoPage.tsx`
- `src/pages/dashboard/AcoesPage.tsx`
- `src/pages/dashboard/AlertasPage.tsx`
- `src/pages/dashboard/PromptsPage.tsx`
- `src/pages/dashboard/DominanciaPage.tsx`
- `src/pages/dashboard/SimuladorPage.tsx`
- `src/pages/dashboard/CampanhasPage.tsx`
- `src/pages/dashboard/NovaCampanhaPage.tsx`
- `src/pages/dashboard/PromptTesterPage.tsx`
- `src/pages/dashboard/RelatoriosPage.tsx`
- `src/pages/dashboard/ConfiguracoesPage.tsx`

Dados:
- `src/lib/mock-data.ts` — Dados ficticios centralizados para todas as paginas

**Modificacoes:**
- `src/App.tsx` — Adicionar rotas `/dashboard/*` com layout aninhado usando React Router Outlet

**Tecnologias utilizadas (ja instaladas):**
- `recharts` para graficos de linha, area e barras (usado com moderacao)
- `framer-motion` para transicoes entre paginas e micro-animacoes
- `lucide-react` para iconografia
- shadcn/ui: Card, Badge, Tabs, Progress, Table, Button, Sidebar

### Ordem de Implementacao

1. Criar dados mockados centralizados (`mock-data.ts`)
2. Criar layout do dashboard (sidebar + header + area principal) com tema claro
3. Criar pagina de Visao Geral com os 3 blocos-resposta
4. Criar as 9 paginas de recursos individuais
5. Criar as 3 paginas extras (Campanhas, Prompt Tester, Relatorios)
6. Criar pagina de Configuracoes
7. Conectar rotas no App.tsx

