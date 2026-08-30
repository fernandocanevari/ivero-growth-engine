# Ciclo de cobrança (mensal x anual) respeitado de verdade

## Estado atual confirmado

- `supabase/functions/_shared/pricing.ts` exporta **só** `PLAN_ANNUAL_VALUES` (397/717/1197).
- `create-checkout` faz `const PLAN_VALUES = PLAN_ANNUAL_VALUES` e cria a assinatura no Asaas com `cycle: "MONTHLY"` — o valor promocional é cobrado sempre, mesmo para quem escolheu mensal.
- `manage-subscription` (change_plan) usa o mesmo `PLAN_ANNUAL_VALUES` para o valor novo e para o cálculo do pró-rata.
- Frontend: `EscolherPlanoPage`, `InvestSection` e `UpgradeModal` têm o estado `isAnnual` (default `true`) usado apenas para formatar preço na tela. Nenhum envia ciclo no body (`UpgradeModal` manda `billing_cycle` só para `change_plan`? — hoje envia o campo mas o backend ignora).
- `cancel` apenas marca `status='cancelado'`, limpa o vínculo Asaas e preserva acesso até `data_vencimento`. Não há qualquer noção de compromisso de 12 meses.
- Já existe a rotina de cobrança avulsa (`POST /payments` com `billingType: UNDEFINED`, `dueDate = hoje`, `externalReference`) usada no pró-rata do upgrade — é ela que será reaproveitada na multa de cancelamento.

## 1. Frontend — enviar o ciclo

Padronizar um único campo `ciclo: "mensal" | "anual"` (derivado de `isAnnual`) no body de:

- `create-checkout` — `EscolherPlanoPage.tsx`, `InvestSection.tsx`, `UpgradeModal.tsx` (fluxo de recontratação).
- `manage-subscription` action `change_plan` — `UpgradeModal.tsx` (substitui/normaliza o `billing_cycle` atual).

Compatibilidade: backend aceita `ciclo` e, como fallback, `billing_cycle` (`annual`→`anual`). Ausente = `anual` (comportamento atual, evita regressão em chamadas antigas).

No `AssinaturaPage`, exibir o ciclo contratado e, quando anual, quantos ciclos faltam para cumprir o compromisso (leitura, sem cobrança).

## 2. Backend — valor conforme o ciclo

Em `_shared/pricing.ts`, adicionar `PLAN_MONTHLY_VALUES` (497/897/1497) ao lado do `PLAN_ANNUAL_VALUES` (valores inalterados, apenas espelhados de `pricing-rules.ts`; o teste existente `pricing-rules.test.ts` ganha um caso para o mapa mensal) e um helper `planValue(plano, ciclo)`.

- `create-checkout`: `value = planValue(plano, ciclo)`; `cycle` no Asaas continua `MONTHLY` nos dois casos; descrição da assinatura passa a citar o ciclo contratado.
- `manage-subscription/change_plan`: usa `planValue` com o ciclo recebido (ou o `ciclo_contratado` gravado, se não vier nada). A **lógica de proration do upgrade não muda** — só passa a ler o valor certo.

## 3. Schema — novos campos em `assinaturas`

- `ciclo_contratado text not null default 'anual'` (valores `mensal` | `anual`, validado por trigger, não CHECK).
- `compromisso_inicio timestamptz null` — preenchido quando `ciclo_contratado='anual'` passa a valer (primeiro pagamento confirmado).
- `compromisso_meses integer not null default 12`.
- `ciclos_pagos integer not null default 0` — incrementado pelo `asaas-webhook` a cada `PAYMENT_CONFIRMED`/`RECEIVED` da assinatura.

Contagem de meses com desconto no cancelamento: `min(ciclos_pagos, meses decorridos desde compromisso_inicio)` — usa o contador de pagamentos como fonte primária e a data como sanidade, sem depender de cron.

## 4. Cancelamento com compromisso anual

No `cancel`, antes de gravar `status='cancelado'`:

1. Se `ciclo_contratado <> 'anual'` ou `ciclos_pagos >= 12` → fluxo atual, sem cobrança.
2. Caso contrário: `multa = (mensal[plano] - anual[plano]) * ciclos_com_desconto`.
3. Se `multa > 0`, emitir a cobrança avulsa pela mesma função usada no pró-rata (`POST /payments`, `dueDate` hoje, `externalReference: fidelidade:<assinatura_id>`), e devolver `{ multa: { value, ciclos, invoiceUrl } }`.
4. Falha na cobrança **não** bloqueia o cancelamento (mesma política do pró-rata): registra em log para tratamento manual.
5. UI (`AssinaturaPage`): o diálogo de cancelamento passa a mostrar, antes de confirmar, o valor estimado da multa (calculado no front pelos mesmos dados do `useSubscriptionStatus`) e, após confirmar, o link da fatura gerada.

Trial cancelado antes de qualquer pagamento → `ciclos_pagos = 0` → nenhuma multa.

## 5. Termos de Uso

O compromisso de 12 meses e a cobrança da diferença retroativa precisam constar nos Termos de Uso e na tela de planos (aviso curto junto ao toggle "Anual"). **Não faz parte desta implementação** — fica sinalizado como próximo passo de conteúdo jurídico.

## Ordem de execução proposta

1. Migração dos 4 campos em `assinaturas` (+ trigger de validação).
2. `_shared/pricing.ts` com o mapa mensal + `planValue` e teste de paridade.
3. `create-checkout` lendo o ciclo e gravando `ciclo_contratado`.
4. `asaas-webhook` incrementando `ciclos_pagos` e setando `compromisso_inicio`.
5. `manage-subscription`: `change_plan` com o valor do ciclo + `cancel` com multa de fidelidade.
6. Frontend: envio do ciclo, exibição do compromisso, aviso no diálogo de cancelamento.
7. Testes no Sandbox Asaas: assinatura mensal (497), assinatura anual (397), cancelamento anual com 2 ciclos pagos (multa 200), cancelamento anual em trial (sem multa), cancelamento mensal (sem multa).
