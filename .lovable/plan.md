# Diagnóstico: por que a aba Evolução mostra menos pontos que Score/Histórico

## 1. A separação foi proposital — mas incompleta

As duas tabelas guardam coisas diferentes de propósito:

- **audit_reports** = o relatório inteiro de uma análise (radar, pilares com critérios e justificativas, keywords, motores). Serve para reabrir a auditoria antiga.
- **analysis_history** = só os 6 números (geral + 5 pilares) mais dois campos derivados que a auditoria não tem: `perception_snapshot` (as tags verde/amarelo/vermelho) e `models_ok` (quais IAs responderam, para os deltas compararem bases iguais). Serve para a série do gráfico e para outras telas.

Ou seja: `analysis_history` nunca foi pensada como "só reanálises". A intenção sempre foi "toda análise entra nas duas". Isso está explícito no próprio código, que grava nas duas tabelas em três caminhos:

- reanálise pelo dashboard → as duas
- diagnóstico feito no onboarding (cliente que se cadastra direto) → as duas
- restaurar um snapshot antigo → as duas

**O único caminho que grava em uma só é a adoção do diagnóstico anônimo do /preview** (quando o visitante vê o resultado e depois cria conta): ali o código insere apenas em `audit_reports`. É uma omissão desse caminho específico, não um conceito diferente.

Consequência prática: quem chegou pelo /preview tem 1 auditoria a mais nas abas Score/Histórico do que na Evolução. Foi exatamente o que vimos na conta cliente58 (3 em audit_reports, 1 em analysis_history).

## 2. O que faz sentido para o cliente

Mostrar **tudo**, incluindo o diagnóstico do preview. Aquele primeiro número é o marco zero da história dele — é justamente contra ele que o cliente quer medir se melhorou. Esconder o ponto de partida transforma a Evolução numa linha que começa depois do esforço já ter começado. E ter dois históricos diferentes na mesma tela, dependendo da aba, é indefensável.

## 3. Recomendação: opção (b), com um ajuste

**Fazer a adoção do snapshot do preview gravar também em analysis_history**, mantendo as duas tabelas.

Por que não a (a) — ler a Evolução de audit_reports:

- `audit_reports` não tem `perception_snapshot` nem `models_ok`. As tags de percepção, os alertas e a comparação de deltas por base de modelos dependem desses campos. Trocar a fonte da Evolução quebraria ou degradaria essas telas, ou obrigaria a recalcular tudo na hora, a cada render.
- Mais quatro pontos do produto leem `analysis_history` hoje (tags de percepção, alertas, contexto do gerador de conteúdo e a função de geração no servidor). A opção (a) resolve uma aba e deixa esses quatro com a mesma inconsistência.
- `audit_reports` também recebe entradas que não são análises novas (a restauração de um snapshot antigo insere uma linha nova). Usá-la como série temporal criaria pontos duplicados no gráfico.

Escopo da correção proposta:

1. Na adoção do snapshot do preview, inserir também a linha em `analysis_history`, derivando os 5 pilares do radar e o `perception_snapshot` a partir deles — mesma conversão que a restauração de snapshot já faz.
2. Manter a operação idempotente: a adoção já é protegida por marcação de sessão e checagem de auditoria existente; a inserção no histórico entra sob a mesma proteção, para não duplicar.
3. **Ajuste importante:** o cooldown de 30 dias da reanálise é calculado pela última linha de `analysis_history`. Se o diagnóstico do preview passar a entrar lá, o cliente que acabou de se cadastrar ficaria 30 dias sem poder rodar a primeira reanálise — hoje ele consegue. A regra do cooldown não muda; ela passa a considerar apenas análises feitas dentro do dashboard, para preservar exatamente o comportamento atual.
4. **Backfill:** as contas que já existem continuam com o histórico incompleto. Proponho uma correção pontual que copia para `analysis_history` as auditorias antigas de origem "preview" que não têm linha correspondente. Isso mexe em dados existentes, então só executo com sua aprovação explícita.

## Detalhes técnicos

- Arquivos envolvidos: `src/lib/existing-diagnostic.ts` (adoção), `src/lib/diagnostic-engine.ts` (reaproveitar a montagem do registro de histórico), `src/hooks/useAnalysisHistory.ts` (cooldown por análises do dashboard).
- Nada de `simulate-ai`, cálculo de score, regras de plano ou cobrança é tocado.
- O backfill seria uma migração/consulta separada, com contagem antes e depois.
