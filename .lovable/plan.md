# Billing real no Asaas: upgrade, cancelamento e cartão

## Estado atual (verificado no código)

- `create-checkout` só sabe **criar** assinatura via `POST /checkouts`. Idempotência (linhas 74-123): se existir linha em `assinaturas` com status vivo **e** `asaas_subscription_id` preenchido, ele devolve `reused: true` + a `invoiceUrl` da cobrança pendente. Nunca troca de plano.
- `UpgradeModal.handleSelectPlan` (linhas 70-78) só faz `track()` e abre um sub-modal estático com `mailto:` — não chama nenhuma função.
- `AssinaturaPage`: badge "Demonstração — gateway em breve" (linha 87), `mockInvoices` (linha 35), "Adicionar cartão" e "Cancelar" abrem o modal "Disponível em breve" (linhas 375-398). Cards "Próxima cobrança" e "Forma de pagamento" são texto fixo.
- `asaas-webhook` já trata `PAYMENT_*`, `CHECKOUT_*`, `SUBSCRIPTION_CREATED/DELETED/INACTIVATED`.

## Viabilidade das APIs do Asaas (confirmada na doc oficial)

| Necessidade | Endpoint | Veredito |
|---|---|---|
| Trocar plano/valor | `PUT /subscriptions/{id}` (`value`, `nextDueDate`, `updatePendingPayments`) | Suportado — **não precisa cancelar e recriar** |
| Cancelar | `DELETE /subscriptions/{id}` (encerra e apaga cobranças pendentes/vencidas; pagas ficam no histórico) | Suportado |
| Suspender sem apagar | `PUT /subscriptions/{id}` com `status: INACTIVE` | Suportado |
| Atualizar cartão | `PUT /subscriptions/{id}/creditCard` (aceita `creditCardToken`, sem cobrança imediata, atualiza cobranças pendentes) | Suportado |
| Faturas reais | `GET /subscriptions/{id}/payments` (retorna `value`, `dueDate`, `status`, `invoiceUrl`, `transactionReceiptUrl`) | Suportado |

Limite importante: **o Asaas não faz rateio proporcional (pro-rata)**. Mudança de valor vale só para cobranças futuras.

## Desenho proposto

### Nova edge function `manage-subscription`
Uma função única, com `action` no body, validando JWT do mesmo jeito que `create-checkout`. `create-checkout` fica **intocado** e responsável apenas por "primeira contratação".

`POST manage-subscription` com `{ action, ... }`:

**1. `action: "change_plan"` (`{ plano }`)**
- Sem `asaas_subscription_id` (trial local / pendente): **não fala com o Asaas**. Só atualiza `assinaturas.plano` e devolve `{ mode: "local" }` — a cobrança correta nasce depois, no `create-checkout`. Cobre o cliente em trial.
- Com `asaas_subscription_id` (pagante): `PUT /subscriptions/{id}` com `value` do novo plano (de `_shared/pricing.ts`), `updatePendingPayments: true` e `nextDueDate` preservado. Local: atualiza `plano` e mantém `status`.
  - **Upgrade** (valor maior): opção de cobrar a diferença já no próximo ciclo (padrão, mais simples) — sem cobrança extra imediata.
  - **Downgrade** (valor menor): aplica no próximo vencimento, mantendo o acesso ao plano maior até lá.

**2. `action: "cancel"` (`{ motivo? }`)**
- Com vínculo Asaas: `DELETE /subscriptions/{id}`.
- Local: `status = 'cancelado'`, `data_vencimento` mantido como fim do período já pago.
- **Acesso:** não perde na hora. `useSubscriptionStatus`/`subscription-status.ts` passam a tratar `cancelado` com `data_vencimento` no futuro como acesso liberado ("cancelado, ativo até dd/mm"); expirado o período, cai no gate normal. Isso mantém a promessa do FAQ ("acesso até o fim do ciclo pago").
- UI: modal de confirmação em 2 passos com o motivo (feed pro CRM) e a data até quando o acesso vale.

**3. `action: "update_card"`**
- **Não coletamos cartão no nosso front** (evita escopo PCI). Fluxo: criamos uma nova Checkout Session curta de valor simbólico? Não — melhor: usamos `PUT /subscriptions/{id}/creditCard` com `creditCardToken` obtido pelo campo tokenizado do Asaas, ou, mais simples pro MVP, devolvemos o `invoiceUrl` da próxima cobrança pendente, onde o Asaas já hospeda a atualização de cartão.
- Recomendação pro lançamento: rota simples (`invoiceUrl` hospedado). O `PUT .../creditCard` entra depois, se quisermos cartão dentro do app.

**4. `action: "list_invoices"`**
- `GET /subscriptions/{id}/payments` → devolve lista normalizada (`data`, `valor`, `status`, `invoiceUrl`, `transactionReceiptUrl`) e o resumo de próxima cobrança (primeira `PENDING`).

### Distinção de responsabilidades
```text
create-checkout      → não tem assinatura no Asaas ainda  (criar)
manage-subscription  → já tem linha local (com ou sem Asaas)
                       change_plan | cancel | update_card | list_invoices
```
Regra de roteamento no front (`useSubscriptionStatus`): se `isPaid` e há vínculo Asaas → `manage-subscription`; senão → `create-checkout`. A idempotência atual do `create-checkout` deixa de ser um beco sem saída porque o UpgradeModal nunca mais o chama para quem já é pagante.

### Webhook
Adicionar `SUBSCRIPTION_UPDATED` (confirma valor/plano) e manter `SUBSCRIPTION_DELETED` como confirmação do cancelamento (grava `status='cancelado'` caso o `DELETE` tenha vindo do painel do Asaas, não do app).

### Limpeza da AssinaturaPage
- Remove badge "Demonstração — gateway em breve", `mockInvoices` e o modal "Disponível em breve".
- "Próxima cobrança", "Forma de pagamento" e "Histórico de faturas" passam a vir de `list_invoices` (novo hook `useBillingInvoices`), com skeleton e empty state real ("Nenhuma cobrança ainda").
- Revisar 2 respostas do FAQ que hoje dizem "gateway em finalização" e "nada será cobrado automaticamente".

## Notas técnicas
- Arquivos: nova `supabase/functions/manage-subscription/index.ts`, ajustes em `asaas-webhook`, `src/lib/subscription-status.ts`, `src/hooks/useSubscriptionStatus.ts`, novo `src/hooks/useBillingInvoices.ts`, `src/components/dashboard/UpgradeModal.tsx`, `src/pages/dashboard/AssinaturaPage.tsx`.
- Sem migração de banco obrigatória; opcional: `cancelado_em` e `motivo_cancelamento` em `assinaturas` para o CRM.
- Segue sandbox (`ASAAS_API_KEY_SANDBOX`); a chave de produção entra por secret novo quando você decidir.
- Teste: trial troca de plano (só local), pagante troca de plano (valor muda no Asaas), cancelamento mantendo acesso até o vencimento, faturas reais listadas.
