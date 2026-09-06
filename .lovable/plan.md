# Diagnóstico dos 2 pontos (sem correção aplicada)

## ITEM 1 — "Assinar agora" caiu na troca local (regressão real)

Confirmado: **sim, os dois botões usam o mesmo componente e a mesma lógica.**
O botão "Assinar agora" do banner de trial (`TrialBanner.tsx`, linha 154) abre
exatamente o mesmo `UpgradeModal` usado pelo "Mudar plano" da página de
Assinatura, pela `TrialLockedPage` e pelo Gerador de Conteúdo. O modal não
recebe nenhuma informação sobre de onde foi aberto.

Dentro do modal, ao escolher um plano, a decisão é única:

```text
canChangePlan = assinatura viva no provedor
              OU (status = trial E sem vínculo no provedor)   ← pega o "Assinar agora"
```

Como todo cliente em trial cai no segundo ramo, o modal chama
`manage-subscription/change_plan`, troca o plano no banco e mostra
"Plano alterado para Autoridade". O checkout nunca é chamado. Não é bug do
servidor: o `create-checkout` só recusa abrir checkout quando recebe
`intent: "trocar_plano"` — e recebe, porque o modal envia esse intent fixo em
todos os casos.

Ou seja: a correção de ontem estava certa para "Mudar plano", mas foi aplicada
num componente compartilhado, então engoliu também a intenção de pagar.

### Correção proposta (não aplicada)

1. `UpgradeModal` passa a receber a intenção de quem abriu:
   `intent: "contratar" | "trocar_plano"` (default `"trocar_plano"`, que é o
   comportamento atual da página de Assinatura).
2. Quando `intent = "contratar"`, o modal **pula inteiramente** o ramo de troca
   local: vai direto ao `create-checkout` enviando `intent: "contratar"` — e o
   servidor, que já distingue os dois intents, abre o checkout normalmente
   mesmo em trial.
3. Passar `intent="contratar"` em: `TrialBanner` ("Assinar agora" / "Ver
   planos" — os dois são conversão), `TrialLockedPage` e Gerador de Conteúdo
   (recurso bloqueado = contratar). Manter `trocar_plano` só na página de
   Assinatura.
4. Ajustar título/CTA do modal conforme a intenção ("Assine seu plano" vs.
   "Trocar de plano"), para o cliente não achar que só está trocando rótulo.
5. Nada de `pricing-rules.ts`, valores, pró-rata ou `simulate-ai` muda.

## ITEM 2 — "7 de 7 dias restantes" com mais de 1 dia de conta

O dado no banco está **correto**. Exemplo real (conta de teste criada ontem):

```text
criada em      2026-09-05 17:58 UTC
trial_ends_at  2026-09-12 17:58 UTC
agora          2026-09-06 13:48 UTC
restante real  6 dias e 4 horas
```

O banner já lê `trial_ends_at` de verdade (o bug antigo do localStorage segue
corrigido). O problema é só o **arredondamento**: `trialDaysLeft` faz
`Math.ceil(horas / 24)`, então 6 dias e 4 h viram 7. Só depois de passar de
6 dias exatos é que cairia para 6 — na prática o cliente vê "7 de 7" durante
quase 24 h e o contador parece travado.

### Correção proposta (não aplicada)

Trocar o arredondamento por um cálculo de "dias inteiros restantes, com o dia
em curso contado como parcial": usar `Math.floor(horas / 24)` e garantir
mínimo 1 enquanto houver tempo. Com isso, 6 d 4 h → "6 de 7", e as últimas
horas continuam entrando no estado de urgência em horas (já existente, últimas
48 h). Muda só `trialDaysLeft` em `src/lib/subscription-status.ts` e os testes
correspondentes; `isTrialExpired`, gating e status efetivo não são tocados.

## Escopo técnico

- Arquivos: `src/components/dashboard/UpgradeModal.tsx`,
  `src/components/dashboard/TrialBanner.tsx`,
  `src/components/dashboard/TrialLockedPage.tsx`,
  `src/pages/dashboard/GeradorConteudoPage.tsx`,
  `src/lib/subscription-status.ts` (+ testes).
- Sem migração de banco. Sem alteração em edge functions.
- Testes: trial clicando "Assinar agora" vai para checkout; trial clicando
  "Mudar plano" segue troca local; pagante mantém pró-rata; contador exibe
  6 de 7 para conta de ontem.
