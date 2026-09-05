# Item A (implementar) + diagnóstico dos Itens B, C e D

## Item A — Pular a tela "Seu diagnóstico personalizado" para quem já viu no preview

Hoje o fluxo é: objetivos (`OnboardingSitePage`, `navigate("/onboarding/diagnostico")`) → página de diagnóstico, que só *internamente* decide se roda a análise ou adota a existente. Ou seja, quem veio do preview ainda vê a tela.

Mudança:

1. Na conclusão dos objetivos, antes de navegar, verificar o mesmo sinal já usado hoje: última linha de `audit_reports` do usuário com `overall_score > 0` **ou** `sessionStorage["ivero:lastDiagnostic"]` com `geoScore > 0`.
2. Se existir: marcar `profiles.is_first_login = false`, garantir que o snapshot do preview seja salvo em `audit_reports` (adoção, se ainda não estiver) e navegar direto para `/dashboard` — a tela de diagnóstico nunca aparece.
3. Se não existir: comportamento atual, `/onboarding/diagnostico` roda a primeira revelação.
4. Guarda extra na própria página de diagnóstico: se ela for aberta direto (link/refresh) e já houver diagnóstico, redireciona para `/dashboard` em vez de renderizar o resultado adotado. Isso remove a variação de copy do botão ("ir para o dashboard"), que passa a ser desnecessária.

Nada do `simulate-ai`, do gate do preview ou de pricing é tocado.

## Item B (diagnóstico) — plano mudou sem pagamento confirmado

Causa raiz confirmada, é gravação real no banco no momento em que o checkout é **criado**, não otimismo de UI/cache.

- `UpgradeModal` só usa `change_plan` quando existe assinatura viva no provedor (`hasAsaasSubscription`). Cliente em trial não tem `asaas_subscription_id`, então cai no `create-checkout`.
- `create-checkout` cria a Checkout Session no Asaas e, em seguida, **atualiza a linha viva de `assinaturas` in place** com `plano` novo, `ciclo_contratado`, `status`, `trial_ends_at` e `asaas_checkout_id`. Isso acontece antes de qualquer pagamento; se o cliente abandonar a tela do Asaas, o plano novo fica gravado.
- Dado real do cliente afetado (`394e3295…`): `plano = autoridade`, `status = trial`, `asaas_checkout_id` preenchido, `asaas_subscription_id` nulo — exatamente a assinatura marcada por um checkout não concluído.

Resposta à pergunta 2: hoje o comportamento real é "abre checkout **e** já troca o plano no banco". Em trial não existe cobrança a conciliar, então a troca de plano durante o trial deveria ser local e gratuita (sem abrir Asaas), e a coleta de cartão acontecer só no fim do trial. Correção proposta (para aprovação): em trial sem vínculo Asaas, `change_plan` atualiza `plano`/`ciclo_contratado` direto, sem checkout; e `create-checkout` deixa de aplicar `plano` novo na linha viva antes da confirmação — grava a intenção (plano pretendido + `asaas_checkout_id`) e só promove no pagamento confirmado (webhook/reconciliação).

## Item C (diagnóstico) — "Atualizar cartão" mostra mensagem de suporte

É consequência direta do Item B.

- Como o checkout abandonado gravou `asaas_checkout_id`, `resolveSubId()` não encontra assinatura no Asaas e o `manage-subscription` classifica a linha como "órfã" (`orfa = !!(asaas_checkout_id || asaas_customer_id)`), retornando `reason: "assinatura_nao_localizada"` com a copy de suporte.
- O `AssinaturaPage` só troca para a copy de trial quando `reason === "sem_assinatura_asaas"`, então a mensagem de trial nunca aparece nesse estado.

Correção proposta: antes de classificar como órfã, considerar o status; cliente em trial sem `asaas_subscription_id` recebe `reason: "trial_sem_cobranca"` (copy de trial) mesmo com `asaas_checkout_id` presente, e o front reconhece esse motivo. Resolvido o Item B, esse estado praticamente deixa de existir, mas a classificação continua defensiva.

## Item D (diagnóstico) — card do Painel não reflete diagnóstico existente

Fontes diferentes, confirmado:

- `DiagnosticoPage` lê primeiro `sessionStorage["ivero:lastDiagnostic"]` (é ali que está o score 78 do preview) e só depois o banco.
- O card do Painel usa `useHasDiagnostic`, que conta exclusivamente linhas de `audit_reports` + `analysis_history` no banco.
- Verificação no banco: o cliente do cenário não tem nenhuma linha em `audit_reports` nem em `analysis_history` (0 e 0). Logo `hasDiagnostic = false` e o card de estado vazio aparece, embora a página Diagnóstico IA mostre o resultado da aba.
- Por que não persistiu: a adoção do snapshot do preview (`useAdoptPendingAudit`, no `DashboardLayout`) depende de o `sessionStorage` daquela aba sobreviver até o dashboard, e falha silenciosamente (`console.warn`). A etapa de diagnóstico do onboarding também "adota" o snapshot apenas para exibir, sem gravar em `audit_reports`.

Correção proposta: persistir o snapshot do preview em `audit_reports` no primeiro momento autenticado confiável (no signup/pós-login, não só ao entrar no layout do dashboard), fazer a adoção reportar falha em vez de só logar, e alinhar `useHasDiagnostic` para considerar o snapshot de sessão como diagnóstico válido enquanto a gravação não confirmar.

## Detalhes técnicos

- Arquivos do Item A: `src/pages/OnboardingSitePage.tsx` (decisão de rota após objetivos), `src/pages/OnboardingDiagnosticoPlaceholderPage.tsx` (guarda de redirect).
- Arquivos citados em B/C/D (sem alteração agora): `supabase/functions/create-checkout/index.ts`, `supabase/functions/manage-subscription/index.ts`, `src/components/dashboard/UpgradeModal.tsx`, `src/pages/dashboard/AssinaturaPage.tsx`, `src/hooks/useHasDiagnostic.ts`, `src/hooks/useAdoptPendingAudit.ts`, `src/pages/dashboard/DashboardOverview.tsx`.
