# Diagnóstico: botão "Nova análise" ainda fabrica dado

Confirmado: **o bug continua existindo hoje**. O Item 22 removeu o mock da *exibição* do Diagnóstico, mas não tocou no caminho de gravação do botão "Realizar nova análise".

## 1. O botão roda análise real?

Não. Em `src/pages/dashboard/DiagnosticoPage.tsx` (`handleReanalyze`, linhas 199-227) ele chama `runAnalysis.mutate()` com cinco números **fixos escritos no código**: clareza 82, autoridade 35, conversão 58, posicionamento 64, experiência 71. Nenhuma chamada ao motor real (`simulate-ai`) acontece.

Em `src/hooks/useAnalysisHistory.ts` esses números passam por `randomVariation(base, 8)` (linhas 26-29), que soma um valor aleatório entre -3 e +5 pontos, e o resultado é gravado em `analysis_history` como se fosse uma medição nova.

Além disso, o `onSuccess` do mesmo botão insere uma linha em `audit_reports` com `source: "reanalise"` copiando o radar/pilares **do relatório anterior** — ou seja, duas gravações inconsistentes entre si: o gráfico de evolução recebe números aleatórios e o histórico de auditorias recebe uma cópia duplicada do diagnóstico antigo.

## 2. Quem é afetado

Todos, sem exceção — os valores não vêm do cliente. Cliente sem diagnóstico real passa a ter um histórico inteiramente inventado; cliente com diagnóstico real passa a ter, ao lado do dado verdadeiro, pontos falsos ancorados em 82/35/58/64/71 (que nem sequer são o score real dele). Nos dois casos o gráfico de Evolução Estratégica e as Tags de Percepção passam a mostrar tendência fictícia.

## 3. Limite de frequência

Existe, e serve de base para a correção:
- Cooldown de 30 dias no cliente (`canReanalyze` em `useAnalysisHistory.ts`), botão desabilitado e com contagem de dias restantes.
- Rate limit de 5 chamadas/hora por IP dentro da própria função `simulate-ai`.

Ou seja, trocar a fabricação pela análise real não abre brecha de custo.

## 4. Correção proposta

Todo o necessário já existe e será reaproveitado sem alterar `simulate-ai` nem o motor:

1. `handleReanalyze` passa a usar `runDiagnostic(brandName)` de `src/lib/diagnostic-engine.ts` — a mesma função que o onboarding (caminho 2) já usa — com a marca vinda de `brand_settings`.
2. Em caso de sucesso, gravar com `persistDiagnostic({ source: "reanalise", writeAnalysisHistory: true })`, que já escreve `audit_reports` + `analysis_history` + `sessionStorage` de forma coerente, com os pilares/keywords/modelos reais da rodada.
3. Remover as duas gravações antigas: o `runAnalysis.mutate` com números fixos e o insert manual de `audit_reports` no `onSuccess`.
4. Em `useAnalysisHistory.ts`, aposentar `randomVariation` e a mutação `runAnalysis` (mantendo `history`, `lastAnalysis`, `canReanalyze`, `daysRemaining`), para que não sobre nenhum caminho capaz de gravar dado fabricado.
5. Estado de carregamento e mensagens: reusar o loading já existente do botão e a mesma linguagem de erro do onboarding quando os modelos não responderem — sem gravar nada em caso de falha.
6. Manter o cooldown de 30 dias como está.

### Observação sobre dados já gravados

Existem linhas em `analysis_history`/`audit_reports` criadas por esse caminho fabricado. Se você quiser, posso levantar quantas são e propor uma limpeza em um passo separado — nada será apagado sem sua aprovação.

## Detalhes técnicos

- Arquivos afetados: `src/pages/dashboard/DiagnosticoPage.tsx`, `src/hooks/useAnalysisHistory.ts`.
- Intocados: `supabase/functions/simulate-ai`, `src/lib/diagnostic-engine.ts` (apenas consumido), `pricing-rules.ts`, gate do preview.
- Testes: ajustar `src/hooks/useAuditReports.test.tsx`, que hoje exercita `useAnalysisHistory.runAnalysis`, e cobrir a re-análise chamando o motor real e persistindo o resultado.
