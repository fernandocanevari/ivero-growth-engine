# Diagnóstico: troca de plano em trial abriu tela de pagamento

## Resposta direta às 2 perguntas

**1. O `asaas_checkout_id` residual influencia o roteamento? Não.**

A decisão "troca local vs. checkout" acontece hoje só no front, em `UpgradeModal.tsx`:

```
canChangePlan = !isAdmin && (
  (temAssinaturaNoAsaas && (status ativo | inadimplente))
  || (status trial && !temAssinaturaNoAsaas)
)
```

`temAssinaturaNoAsaas` vem de `useSubscriptionStatus`, que é calculado **apenas** com
`asaas_subscription_id`. Esse hook nem lee a coluna `asaas_checkout_id` (não está no
`select`). Logo, um checkout abandonado antigo não entra nessa conta.

**2. Então qual é a causa raiz?**

A causa raiz não é o dado residual — é **onde a decisão mora**. A regra "em trial sem
vínculo, troca é local" existe somente no navegador. O `create-checkout` no servidor não
tem nenhuma guarda equivalente: se for chamado para um cliente em trial sem vínculo, ele
cria a sessão de pagamento no Asaas normalmente, grava `plano_pretendido` +
`asaas_checkout_id` e devolve a URL. Basta o front chegar nessa chamada por qualquer
motivo — estado de assinatura ainda não resolvido no momento do clique (aí o status vale
"sem_assinatura", e a condição de trial falha), aba antiga com o pacote anterior à
correção das 19:48, ou entrada pela tela `/n` (Escolher plano), que sempre vai direto ao
checkout — e a tela de pagamento abre.

Confirmação no banco (linha do cliente do teste, atualizada às 22:18):
`status=trial`, `plano=autoridade`, `plano_pretendido=presenca`,
`asaas_checkout_id` preenchido, `asaas_subscription_id` nulo. Ou seja: quem rodou foi o
`create-checkout` (com o Item B funcionando: não promoveu o plano), e não o `change_plan`.
Os logs das funções desse horário já expiraram, então não é possível provar por log qual
ramo do front disparou — a prova está no efeito gravado na linha.

Onde o `asaas_checkout_id` residual **realmente** atrapalha (efeito colateral, não a
causa desta abertura de checkout): em `manage-subscription`, `resolveSubId()` tenta
resolver uma assinatura no provedor a partir dele/do customer, e a coluna também pesa na
classificação de mensagens de "Atualizar cartão".

## Correção proposta

### 1. Autoridade no servidor (essencial)
`manage-subscription/change_plan` já resolve trial sem vínculo como troca local. Falta o
espelho: `create-checkout` passa a **recusar** abrir checkout quando a linha viva é trial
válido sem `asaas_subscription_id`, respondendo 200 com
`{ ok: false, reason: "trial_troca_local", plano }`. O front, ao receber isso, chama
`change_plan` e mostra "Plano alterado". Assim a regra deixa de depender do estado do
navegador.

### 2. Front não decide com dado ainda não resolvido
No `UpgradeModal`, bloquear o clique enquanto `isLoading` for verdadeiro (botão em estado
de carregamento) em vez de assumir "sem assinatura" e cair no checkout.

### 3. Envelhecer checkout abandonado
Guardar quando a sessão de checkout foi criada (`asaas_checkout_created_at`) e considerar
abandonada sem confirmação em **24 h**. A partir disso:
- `resolveSubId()` ignora `asaas_checkout_id` mais velho que 24 h (segue tentando pelo
  customer, que é dado estável);
- ao gravar um novo checkout, o id anterior é substituído (já acontece) e a data é
  atualizada;
- limpeza pontual das linhas de teste atuais que têm checkout órfão em trial.

### 4. Rastreabilidade
`create-checkout` e `change_plan` passam a logar `userId`, `status`, se havia vínculo e
qual ramo foi escolhido — para que um próximo caso desses seja resolvido por log, sem
depender de reconstrução.

## Detalhes técnicos

- Arquivos: `src/components/dashboard/UpgradeModal.tsx`,
  `supabase/functions/create-checkout/index.ts`,
  `supabase/functions/manage-subscription/index.ts`,
  `src/pages/dashboard/AssinaturaPage.tsx` (tratamento do novo `reason`).
- Migração: coluna `asaas_checkout_created_at timestamptz` em `assinaturas`.
- Não muda: `pricing-rules.ts`, valores dos planos, lógica de pró-rata, multa de
  fidelidade, `simulate-ai`.
- Testes: trial puro troca local; trial com checkout abandonado troca local; cliente
  pagante mantém fluxo Asaas com pró-rata; cancelado continua indo para contratação real.
