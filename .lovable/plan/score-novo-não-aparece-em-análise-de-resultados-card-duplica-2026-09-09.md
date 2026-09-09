# Score novo não aparece em "Análise de Resultados" + card duplicado

## Item 1 — Diagnóstico (causa raiz, sem correção)

### 1. De onde cada tela lê
- "Análise de Resultados" (`/dashboard/auditorias`) lê **somente da tabela `audit_reports`** (via `useAuditReports`), ordenada por data desc.
- "Diagnóstico IA" (`/dashboard/diagnostico`) tem outra prioridade de leitura: **primeiro o snapshot da sessão do navegador** (`sessionStorage: ivero:lastDiagnostic`) e só usa `audit_reports` como fallback quando não existe snapshot na sessão.
- `persistDiagnostic` grava nos três lugares ao mesmo tempo: snapshot da sessão + `audit_reports` + `analysis_history`. Quando roda de verdade, as duas tabelas ficam consistentes.

### 2. O que os dados mostram
Consultando a base agora:

```text
cliente54 → audit_reports: 68 (preview, 08/09 22:16)      | histórico: 62 e 68
cliente57 → audit_reports: 78 (preview) e 79 (reanalise, 08/09 22:18) | histórico: 79
cliente58 → audit_reports: 65 e 64 (preview) e 52 (reanalise, 08/09 22:29) | histórico: 52
```

- Não existe **nenhuma** análise com score 79 na conta cliente54. O 79 é da conta **cliente57** (re-análise real, gravada nas duas tabelas às 22:18).
- Os scores 65 e 64 são da conta **cliente58**, não da cliente54.
- Ou seja: nenhuma gravação falhou. Toda re-análise que realmente rodou foi persistida nas duas tabelas, com o mesmo número.

### 3. Causa raiz
O snapshot guardado no navegador (`ivero:lastDiagnostic`) **não é vinculado ao usuário logado** e o Diagnóstico IA dá preferência a ele sobre o banco. Testando várias contas na mesma aba (57 às 22:18, depois 58 às 22:29, depois 54), o snapshot da conta anterior continua valendo e é exibido como se fosse da conta atual. Resultado: o Diagnóstico IA mostra 79 (número de outra conta) enquanto "Análise de Resultados" mostra corretamente o que existe no banco daquela conta.

Fator agravante: na cliente54 a última análise é de 08/09, então o botão "Realizar nova análise" está bloqueado pelo intervalo de 30 dias — a re-análise que parecia ter rodado ali não rodou nem gravou nada.

### 4. Cache
`useAuditReports` usa validade de 5 min sem refazer busca a cada montagem, mas o botão de re-análise invalida essa consulta ao terminar. O cache **não** é a causa: o banco realmente não tem o 79 nessa conta.

### Correção sugerida (não aplicada)
Gravar o dono do snapshot junto com ele e descartá-lo quando o usuário logado for diferente; opcionalmente preferir sempre o relatório mais recente do banco quando ele for mais novo que o snapshot. Só implemento depois da sua aprovação.

## Item 2 — Card duplicado (implementar)
Remover o bloco "Onde sua marca atua e quer ser encontrada" do Diagnóstico IA:
- `src/pages/dashboard/DiagnosticoPage.tsx`: remover o import e o bloco `<BrandCoverageInlineCard />`.
- Mantém-se intacto em Configurações (fonte de verdade para edição). O componente `BrandCoverageInlineCard` fica no projeto sem uso ou é removido, conforme preferir.
