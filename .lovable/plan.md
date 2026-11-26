# CLEARID-chat: relatório (somente leitura, nada foi alterado)

## PARADA: o finding 59 não bate com o código nem com os dados
- TRACED FROM CODE: `manage-subscription/index.ts:989-997`. O cancelamento monta um único `cancelPatch` com `asaas_subscription_id: null` e `asaas_subscription_id_anterior: removedSubId`, **com ou sem multa**. A multa só entra como `...penaltyPatch` (linhas 949-976). Não existem dois caminhos de gravação: "com multa" e "sem multa" usam a mesma instrução. Esse comportamento está ali desde o commit `f71c058` (02/11).
- EXECUTED (consulta ao banco): todas as linhas com status "cancelado" têm `asaas_subscription_id` NULL e `_anterior` preenchido. Isso vale também para as sem multa: cliente82 (mensal, 1 ciclo), cliente75, cliente70 e cliente69 (anuais, 0 ciclos). Vale igualmente para as com multa (cliente74, cliente77, cliente71).
- Conclusão: a correção proposta (limpar o id e guardar o antigo) **já é o comportamento atual**. Não recomendo nenhuma mudança para o finding 59.

## 1. Quem grava os campos (TRACED FROM CODE)
- manage-subscription, cancel: `:993-994`, limpa o id e grava o anterior. Na corrida com o webhook, `:1036-1040` completa a mesma gravação.
- manage-subscription, auto-vínculo do resolveSubId: `:374` grava o id descoberto e ignora o `_anterior` (`:338`).
- preview_cancel, pay_penalty e change_plan não gravam esses campos.
- create-checkout: `:500` e `:561/567` gravam `asaas_subscription_id: null` na nova sessão ou na reativação.
- asaas-webhook: bindIds `:203` (CHECKOUT_PAID, SUBSCRIPTION_CREATED/UPDATED, pagamentos), `:324` (retomada paga) e RPC `claim_subscription_payment` (coalesce do id).
- asaas-webhook, remoção: `subscription-lifecycle.ts:66` limpa o id e grava o anterior, só se a linha ainda tiver exatamente esse id.
- reconcile-asaas: `:273` e `:308` gravam o id somente quando há prova.
- SQL: `claim_subscription_payment` (coalesce, nunca grava nulo).

## 2. Quem lê, numa linha "cancelado" (que já tem id NULL e anterior preenchido)
| Leitor | Hoje | Se a mudança proposta fosse aplicada |
|---|---|---|
| resolveSubId (`:233`) | subId nulo; a descoberta pula o `_anterior` | igual (já é assim) |
| list_invoices: histórico anterior (`:1172-1173`) | lista as faturas pelo `_anterior` | igual |
| list_invoices: próxima cobrança | sem assinatura atual, não busca nada | igual |
| update_card | sem assinatura resolvida, devolve ok:false | igual |
| cancel repetido (`:893`) | refaz a limpeza no Asaas sem recalcular a multa | igual |
| asaas-webhook SUBSCRIPTION_DELETED (`:470`) | não encontra a linha e registra "não vinculada, ignorada" | igual |
| asaas-webhook PAYMENT_* da assinatura antiga | `matching.ts:27` recusa o vínculo pelo `_anterior` | igual |
| reconcile-asaas (`:114-146`) | sem id, não consulta a assinatura antiga | igual |
| create-checkout (`:199-202`) | filtro `not null` exclui a linha | igual |
| BemVindoPage (`:221`) / useSubscriptionStatus (`:281`) / AgencyBillingPage (`:55`) | id nulo, sem liberação | igual |

## 3. Histórico
TRACED FROM CODE: o `_anterior` é gravado em todo cancelamento, porque é a mesma instrução. O histórico do cliente74 e do cliente82 vem do `_anterior` (`:1173`). EXECUTED (banco): os dois têm o `_anterior` preenchido. Nenhum histórico se perde.

## 4. Webhook
TRACED FROM CODE: a mensagem "não vinculada, ignorada" é o resultado esperado, porque o id já está nulo. Um PAYMENT_* atrasado da assinatura antiga é recusado por `matching.ts:27`. A remoção nunca passa pelo bindIds (comentário `:463-467`). Como nada muda, não há risco novo.

## 5. BemVindoPage / finding 45: a causa é mais ampla
- Condição atual (TRACED, `BemVindoPage.tsx:218-221`): libera "Pagamento confirmado" quando `status === "ativo"`, `status === "trial"` ou `!!asaas_subscription_id`.
- Reativação depois do fim do acesso (cobrança no dia):
  1. create-checkout grava o id como nulo.
  2. Ao concluir o checkout, o Asaas envia SUBSCRIPTION_CREATED / CHECKOUT_PAID.
  3. O webhook grava o **novo** id pelo bindIds (`:203`, `:401`, `:446`) **antes** do PAYMENT_CONFIRMED (o comentário em `:391-394` confirma que o checkout pago não é pagamento confirmado).
  4. A tela libera assim que o novo id aparece, mesmo com status "cancelado" e sem pagamento.
- Reativação com dias restantes (P40): usa o ramo `isResume` (`:190`), que só libera com "ativo". Não é afetado.
- Conclusão: o id antigo não é a causa, porque ele já é limpo. A causa do 45 é o próprio critério "tem id = confirmado". Limpar o id no cancelamento não resolve.

## 6. Testes
TRACED FROM CODE: `cancel_flow_test.ts`, `penalty_flow_test.ts` e `cpf_binding_test.ts` verificam o que o cancelamento grava. Não encontrei teste que espere o id mantido. Nenhum precisaria mudar. Não executei as suítes nesta rodada.

## 7. Recomendação (não implementar agora)
- Finding 59: fechar como "não reproduz". Código e dados mostram o id limpo nos dois casos.
- Finding 45: mudar só a condição da BemVindoPage (`:218-221`). Ela liberaria apenas com status "ativo", ou "trial" na retomada de teste. Ter um id vinculado deixaria de bastar.
  - Arquivos: `src/pages/BemVindoPage.tsx` e seu teste.
  - Risco: um cartão registrado no fim do trial, com cobrança agendada, mostraria "aguardando" até o webhook. Hoje o CHECKOUT_PAID devolve a linha a "trial" (`resumeTrialPatch`), o que precisa ser confirmado num teste antes de aplicar.
  - Nenhuma função no servidor seria alterada.

## Não verificado
- Comportamento real do Asaas: ordem dos eventos SUBSCRIPTION_CREATED e PAYMENT_CONFIRMED no Sandbox.
- As suítes de teste não foram executadas.
- De onde veio a observação original do finding 59: pode ser de antes de `f71c058` ou de uma linha que já foi alterada desde então.
