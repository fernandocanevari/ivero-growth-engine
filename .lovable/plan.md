# Diagnóstico: aba "Evolução" não parece uma evolução

## Resposta curta

As duas coisas, mas o problema principal é de visualização, não de dados.

Existe um gráfico de linha por pilar no código, porém ele está **escondido dentro de uma sub-aba de cada card de pilar** e só aparece com 2 ou mais análises. O que ocupa o topo da aba "Evolução" hoje é o **mesmo radar do snapshot atual** que já aparece na aba "Score" — daí a sensação de conteúdo repetido. Não falta "implementar do zero", falta trazer a tendência para o primeiro plano.

## O que foi verificado

Conteúdo real da aba "Evolução" (a página de pilares embutida), na ordem em que aparece:

1. Radar dos 5 pilares — snapshot da última análise (mesmo gráfico da aba Score).
2. Lista "Resumo por pilar" com o score atual e uma setinha de variação.
3. Um card por pilar; dentro dele, sub-abas "Métricas / Evolução / Análise". A linha de tendência ao longo do tempo está enterrada na sub-aba "Evolução" de cada card, e a sub-aba padrão é "Métricas".

Ou seja: para ver tendência, o cliente precisa descer até um pilar e clicar em uma segunda aba interna — cinco vezes, um pilar por vez. Nunca há uma visão de todos os pilares ao longo do tempo na mesma imagem.

## Sobre os dados

Consultei o histórico de análises de todas as contas:

- A conta com mais histórico tem **3 análises**, mas as três foram criadas no intervalo de 3 minutos do mesmo dia (30/08). O rótulo do eixo usa apenas o mês abreviado, então os três pontos aparecem como "ago / ago / ago" — visualmente parece um gráfico quebrado, não uma evolução.
- Duas contas têm 2 análises; todas as demais têm 1 (com 1 análise a sub-aba "Evolução" nem aparece).

Portanto não existe hoje nenhuma conta capaz de mostrar uma tendência convincente, mesmo que o gráfico estivesse em destaque.

## Proposta (para aprovar depois)

1. Trocar o topo da aba "Evolução": em vez do radar do snapshot, colocar um **gráfico de linhas múltiplas** — uma linha por pilar (5 linhas com legenda clicável) mais uma linha opcional do score geral, no eixo do tempo. É o gráfico que responde "estou melhorando?".
2. Abaixo dele, uma faixa de variação: para cada pilar, valor atual, valor da primeira análise e o delta.
3. Manter os cards por pilar, mas com a sub-aba padrão passando a ser "Evolução" dentro da aba Evolução (e mantendo "Métricas" na aba Score), evitando a duplicação de leitura.
4. Corrigir o rótulo do eixo de tempo para incluir dia + mês (e hora quando há mais de uma análise no mesmo dia), para que análises próximas não colapsem no mesmo rótulo.
5. Estado intermediário honesto: com apenas 1 análise, mostrar "sua linha de evolução começa aqui" com o ponto único e explicação de que a tendência aparece a partir da segunda análise — em vez de esconder o gráfico.
6. Não alterar cálculo de score, `simulate-ai`, regras de plano nem o cadeado da aba para o plano Presença.

## Detalhes técnicos

- Aba renderizada por `VisibilidadeIAPage.tsx` → `PilaresPage embedded`.
- Dados já disponíveis: `useAnalysisHistory` (série temporal por coluna de pilar) e `useAuditReports` (snapshot + `pillar_details`). Nenhuma consulta nova é necessária.
- `evolutionByPillar` em `PilaresPage.tsx` já monta a série; hoje ela é consumida só pelo gráfico interno de cada card e é descartada quando o histórico tem menos de 2 registros.
- Formatação de data atual: `toLocaleDateString("pt-BR", { month: "short" })` — origem do colapso de rótulos.
