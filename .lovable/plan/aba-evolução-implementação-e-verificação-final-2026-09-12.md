# Aba Evolução — implementação e verificação final

## Status: implementado (verificação pendente)

Os 6 pontos aprovados já estão aplicados em `src/pages/dashboard/PilaresPage.tsx`:

1. **Gráfico de linhas múltiplas no topo** — `LineChart` (Recharts) com 1 linha por pilar (`--chart-1..5`) + linha "Score geral" tracejada (`--chart-overall`), legenda clicável que isola/esconde séries (`hiddenSeries`).
2. **Faixa de variação por pilar** — `trendDeltas`: valor atual, valor da primeira análise e delta com seta verde/vermelha, em grade de 5 cards abaixo do gráfico.
3. **Sub-aba padrão "Evolução"** — `PillarDetailCard` recebe `preferEvolution` (true quando `embedded`), abrindo na aba "evolution" quando há histórico; na aba Score continua "Métricas".
4. **Rótulos de tempo corrigidos** — `buildTimeLabels`: dia + mês ("12 set"); quando há mais de uma análise no mesmo dia, acrescenta hora ("12 set 14:03").
5. **Estado com 1 análise** — o gráfico permanece visível com o ponto único e aparece o aviso "Sua linha de evolução começa aqui".
6. **Nada tocado** em cálculo de score, `simulate-ai`, gating ou cadeado da aba.

## O que falta (somente verificação)

1. Rodar typecheck: `bunx tsgo --noEmit -p tsconfig.app.json`.
2. Teste visual com a conta que tem 3 análises no mesmo dia:
   - rótulos do eixo aparecem diferenciados (com hora);
   - gráfico de linhas no topo da aba Evolução, visualmente distinto do radar da aba Score;
   - faixa de variação mostra atual + delta desde a primeira análise.
3. Reportar resultado com captura de tela.

## Detalhes técnicos

- Arquivo alterado: `src/pages/dashboard/PilaresPage.tsx` (linhas 320–585, 682).
- Tokens de cor: `--chart-1` a `--chart-5` e `--chart-overall` em `src/index.css` (`:root` e `.dark`).
- Dados: `useAnalysisHistory` (série temporal) + `useAuditReports` (snapshot atual).
- O radar do snapshot atual é oculto quando `embedded` (aba Evolução); na aba Score ele permanece.
