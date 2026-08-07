# Migrar o checkout do Asaas para Checkout Session

## Estado atual (verificado)

- `create-checkout` cria cliente + assinatura + busca a 1ª cobrança e tenta `PUT /payments/{id}` com `callback` — exatamente a chamada que o Asaas responde com 500 e corpo vazio. Por isso não há auto-redirect.
- O `successUrl` atual aponta para `/retorno-asaas`, e **essa rota não existe** em `src/App.tsx` (só `/bem-vindo` e `/escolher-plano`). Mesmo se o callback funcionasse, o retorno cairia na página de erro.
- `asaas-webhook` só sabe achar a assinatura por `asaas_subscription_id`, que hoje é gravado na criação. Com Checkout Session esse ID só existe depois do pagamento.
- `/bem-vindo` faz polling de 20 tentativas × 3s (60s) e aceita `status` `ativo` ou `trial`.
- Elegibilidade de trial já é calculada em `create-checkout` (`trialConcedido`).

## O que muda

### 1. `create-checkout` → Checkout Session
- Remove a criação de `customers`, `subscriptions` e o `PUT /payments/{id}` com `callback`.
- Passa a chamar `POST /checkouts` com:
  - `billingTypes: ["CREDIT_CARD"]`
  - `chargeTypes: ["RECURRENT"]` + `subscription: { cycle: "MONTHLY", nextDueDate }`
  - `items` com nome do plano e o valor mensal correto (`PLAN_ANNUAL_VALUES` do `_shared/pricing.ts`)
  - `callback: { successUrl, cancelUrl, expiredUrl, autoRedirect: true }`
  - `externalReference: userId` (é o que permite o webhook ligar o pagamento ao usuário)
  - **sem** `customer` — o Asaas coleta nome/CPF/endereço na tela dele
- Elegibilidade de trial preservada: elegível → `nextDueDate` = hoje + 7 dias e `trial_ends_at` gravado; não elegível → `nextDueDate` = hoje, `trial_ends_at` nulo e nenhum campo que sugira trial.
- Continua gravando a linha em `assinaturas` (status `trial` ou `pendente`, reaproveitando linha morta e tratando 23505 como hoje), mas **sem** `asaas_customer_id`/`asaas_subscription_id` — esses passam a ser preenchidos pelo webhook. Guarda o `id` da Checkout Session para rastreio.
- Idempotência (assinatura viva já existente) mantida.

### 2. Rotas de retorno
- `successUrl` → `/retorno-asaas` (sucesso), `cancelUrl` → `/retorno-asaas-cancelado`, `expiredUrl` → `/retorno-asaas-expirado`. O Asaas rejeita query string no callback, então usamos rotas limpas.
- Criar essas rotas em `src/App.tsx` apontando para uma página leve de redirecionamento: sucesso vai para `/bem-vindo?from=asaas`; cancelado/expirado voltam para `/escolher-plano?motivo=checkout_cancelado`.

### 3. `asaas-webhook`
- Em `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED`: se não encontrar linha por `asaas_subscription_id`, resolve pelo `externalReference` do pagamento (o `user_id`) e grava `asaas_subscription_id` + `asaas_customer_id` junto do `status: "ativo"`.
- Mantém o comportamento atual para `PAYMENT_OVERDUE`, `PAYMENT_DELETED` e eventos de assinatura, com o mesmo fallback por `externalReference` quando o ID ainda não estiver vinculado.

### 4. Polling do `/bem-vindo`
- Amplia a janela de espera (o webhook agora roda depois do checkout): ~40 tentativas × 3s (2 min), com mensagem de progresso e o estado `pending` já existente como saída.
- Passa a considerar ativa a linha que tiver `status` `ativo`/`trial` **ou** já com `asaas_subscription_id` preenchido.

## Teste após aplicar
Fluxo completo com cliente novo via Playwright + API sandbox do Asaas: escolher plano → Checkout Session abre → pagar com cartão de teste → confirmar auto-redirect para `/bem-vindo?from=asaas` → confirmar linha em `assinaturas` com `status = ativo` e IDs do Asaas → dashboard liberado. Logs do `create-checkout` e do `asaas-webhook` conferidos no final.

## Notas técnicas
- Arquivos tocados: `supabase/functions/create-checkout/index.ts`, `supabase/functions/asaas-webhook/index.ts`, `src/pages/BemVindoPage.tsx`, `src/App.tsx` + nova página de retorno.
- Nenhuma migração de banco é necessária: `asaas_customer_id`/`asaas_subscription_id` já são nulos por padrão.
- Ambiente segue sandbox (`ASAAS_API_KEY_SANDBOX`).
