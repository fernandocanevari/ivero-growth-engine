# Limpeza das contas de teste (preservando admin e clientes 50–59)

## O que será mantido

- `fernandocanevari@gmail.com` (administrador)
- `cliente50@teste.com.br` até `cliente59@teste.com.br` (10 contas)

## O que será apagado

As demais 79 contas de teste da base, incluindo:

- `cliente01` … `cliente49` (e `cliente4@teste.com.br`)
- `fazenda@teste.com`, `fazenda@teste.com.br`, `fazenda03/04/05@teste.com.br`
- todas as contas de QA: `@ivero-test.com`, `@iverotest.com`, `qafull*/qapartial*@example.com`, `ana.teste.sep05@example.com`, `teste*@ivero-test.com`
- duas variantes criadas em testes de QA: `cliente54+1788381619@teste.com.br` e `cliente55+1788381637@teste.com.br` (não são as contas 54/55 originais, que ficam preservadas)

Junto com cada conta, apago os dados ligados a ela: perfil, marca, concorrentes, respostas do onboarding, diagnósticos e histórico, planos de ação, campanhas, assinaturas, progresso do painel, propostas e leads correspondentes.

## Como será feito

1. Listagem prévia (só leitura) das contas que entram na exclusão, para conferência do total.
2. Exclusão dos dados dependentes na ordem correta das dependências, e por último a conta de acesso.
3. Verificação final: confirmar que sobraram exatamente 11 contas (admin + clientes 50 a 59) e que nenhum dado órfão ficou nas tabelas.

## Observações

- Nada da lógica do produto (cobrança, preços, diagnóstico) é alterado — é só limpeza de dados.
- A ação é irreversível; por isso a lista é conferida antes de executar.
