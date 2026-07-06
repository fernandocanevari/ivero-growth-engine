# Plano — Fluxo Plano → Signup → Onboarding → Dashboard (trial 7d sem cartão)

## Objetivo
Alinhar o fluxo real ao modelo escolhido: o usuário escolhe um plano na landing, faz cadastro simples, entra direto no onboarding interativo (3 perguntas → site → diagnóstico) e cai no dashboard já dentro do **trial de 7 dias sem cartão**. O cartão só é pedido no fim do trial (ou quando o usuário decidir converter em `/dashboard/assinatura`). Nenhuma chamada ao Asaas acontece no signup.

## Diagnóstico (resumo do que motiva o plano)
- Signup nunca cria linha em `assinaturas`. Só a Edge Function `create-checkout` cria — e ela é acionada apenas pelo botão "Confirmar" do modal de checkout.
- Landing e `EscolherPlanoPage` só guardam o plano em `localStorage`; o plano não vira estado no banco.
- `BemVindoPage` faz polling de `assinaturas` e mostra "Confirmando seu pagamento…" / "Pagamento em processamento" quando não encontra linha — foi essa a tela vista pelo usuário.
- Autoridade **não** tem rota diferente; comportamento é igual para os 3 planos. Não é regressão dos Prompts 1–6, é gap arquitetural pré-existente.

## Escopo (o que muda)
Somente a costura do fluxo signup/plano/trial. **Sem** mexer em: `access-control.ts`, `FeatureGate`, `ProtectedRoute` retry logic, schemas das outras tabelas, RLS de tabelas fora de `assinaturas`, layout de páginas.

## Passo 1 — Persistir plano escolhido antes do signup
- Na landing, o clique no CTA do plano já grava `ivero_selected_plan` em `localStorage`. Manter.
- `AuthPage` no signup lê `ivero_selected_plan` do `localStorage` e passa junto no fluxo pós-signup.
- Nenhuma chamada ao Asaas em nenhum ponto do signup.

## Passo 2 — Criar assinatura trial automaticamente no signup
Duas opções técnicas (escolher a mais segura):

**Opção A (preferida): trigger no `auth.users`** parecida com `handle_new_user`. Cria linha em `assinaturas` com:
- `user_id = NEW.id`
- `plano = 'presenca'` (default; será atualizado no passo 3)
- `status = 'trial'`
- `trial_ends_at = now() + interval '7 days'`
- `data_inicio = now()`, `data_vencimento = now() + interval '30 days'`
- `asaas_customer_id = null`, `asaas_subscription_id = null`

**Opção B:** chamar uma nova Edge Function `start-trial` no `onAuthStateChange` do `AuthPage` após signup. Mais frágil (depende do cliente).

Recomendo A. Cria migração com o trigger e mantém tudo server-side.

## Passo 3 — Registrar o plano escolhido no trial
Após o signup, no callback `onAuthStateChange` do `AuthPage` (onde já existem os `setTimeout` de persist), fazer `update` em `assinaturas` do usuário setando `plano = <plano do localStorage>` (default `presenca` se não houver). Limpar `ivero_selected_plan`.

## Passo 4 — Roteamento pós-signup (sem passar por checkout)
- `AuthPage` signup: continua navegando para `/onboarding/perguntas` (já é o comportamento hoje). Remover qualquer referência a `EscolherPlanoPage`/checkout no caminho de signup.
- `/onboarding/perguntas` → `/onboarding/site` → `/onboarding/diagnostico` → `/dashboard` (fluxo já existente do Prompt 4).
- Como `ProtectedRoute` agora encontra `status='trial'` em `assinaturas`, o redirect para `/escolher-plano` não dispara. Sem tocar no ProtectedRoute.

## Passo 5 — CTA dos planos na landing (logado vs deslogado)
Comportamento novo do CTA "Quero X" em `InvestSection`:
- **Deslogado:** grava plano no `localStorage` → navega para `/auth?mode=signup`. Não abre modal de checkout, não chama Asaas.
- **Logado sem `assinaturas`:** apenas cria/atualiza a linha trial (via `update`) e manda para `/onboarding/perguntas`.
- **Logado com trial ativo:** vai direto para `/dashboard` (ou `/dashboard/assinatura` se quiser trocar de plano).
- **Logado com trial expirado / status ≠ ativo:** aí sim abre o modal de checkout atual (create-checkout) para cobrar cartão.

Remover a UI do modal de checkout durante o signup normal — ele fica reservado só para conversão pós-trial.

## Passo 6 — Ponto onde cartão é pedido (conversão)
- `TrialBanner` / `AssinaturaPage` / modal de upgrade continuam existindo. Adicionar/reforçar CTA "Ativar minha assinatura" que chama `create-checkout` (fluxo Asaas atual, sem mudanças na função). Só aqui o Asaas é acionado.
- Opcional (pode ficar para depois): job/edge function que, ao expirar `trial_ends_at`, marca `status='pendente'`. Não é necessário para o fix atual — o `access-control` já cobre gating durante trial.

## Passo 7 — Limpeza do BemVindoPage
`BemVindoPage` hoje assume "vim do Asaas". Como o signup não passa mais por Asaas, ajustar:
- Se `assinatura.status = 'trial'` (comum), pular a tela de "Confirmando pagamento…" e mostrar direto o conteúdo de boas-vindas.
- Manter a tela de polling só para o caso de conversão vinda do Asaas (`?from=asaas` ou similar).

## Arquivos afetados
- `supabase/migrations/<novo>.sql` — trigger `handle_new_user_trial` em `auth.users` criando linha em `assinaturas`.
- `src/pages/AuthPage.tsx` — no callback pós-signup, ler `ivero_selected_plan` e dar `update` do `plano`; garantir navegação para `/onboarding/perguntas` (já existe).
- `src/components/landing/InvestSection.tsx` — reescrever `handlePlanClick` conforme Passo 5; remover auto-abertura do modal para signup; manter modal só para conversão de usuário logado sem trial válido.
- `src/pages/EscolherPlanoPage.tsx` — passar a ser usada só para conversão pós-trial (fluxo Asaas). Remover auto-abertura de modal a partir de `localStorage` no caminho de signup.
- `src/pages/BemVindoPage.tsx` — bypass do polling quando `status='trial'` já existe.
- **Não alterar:** `ProtectedRoute.tsx`, `useSubscriptionStatus.ts`, `access-control.ts`, `FeatureGate.tsx`, `create-checkout/index.ts`, schema de `assinaturas` (só o trigger novo).

## Detalhes técnicos

### Trigger SQL (esboço)
```sql
create or replace function public.handle_new_user_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.assinaturas (
    user_id, plano, status, data_inicio, data_vencimento, trial_ends_at
  ) values (
    new.id,
    'presenca',
    'trial',
    now(),
    now() + interval '30 days',
    now() + interval '7 days'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_trial
after insert on auth.users
for each row execute function public.handle_new_user_trial();
```
Requer índice/unique em `assinaturas.user_id` (verificar; se não houver, criar `unique index` parcial ou usar chave composta apropriada). Sem `GRANT` novo — a tabela já existe com policies.

### Fluxo esperado após implementar
```text
LP: clique CTA plano
   └─► deslogado → /auth?mode=signup (plano em localStorage)
             └─► signup → trigger cria assinatura trial → AuthPage
                          faz update do plano escolhido
                       └─► /onboarding/perguntas → /onboarding/site
                             → /onboarding/diagnostico → /dashboard
   └─► logado sem trial → cria/atualiza trial → /onboarding/perguntas
   └─► logado com trial → /dashboard
   └─► logado sem trial ativo (expirado) → modal checkout → Asaas → cartão
```

## Checklist de aceitação
- [ ] Signup em qualquer um dos 3 planos leva ao onboarding interativo (perguntas → site → diagnóstico), nunca a `/bem-vindo` ou `/escolher-plano`.
- [ ] Após signup, `select * from assinaturas where user_id = <novo>` retorna 1 linha com `status='trial'`, `plano = <escolhido>`, `trial_ends_at ≈ now()+7d`.
- [ ] Nenhuma chamada a `create-checkout` durante signup (verificado nos logs da Edge Function).
- [ ] Cartão só é solicitado quando o usuário clica em "Ativar assinatura" após o trial (fluxo Asaas atual).
- [ ] `ProtectedRoute`, `access-control` e `FeatureGate` intactos.
- [ ] `BemVindoPage` não fica em loop de "Confirmando pagamento…" para novos usuários.
- [ ] Comportamento idêntico para Presença, Influência e Autoridade.
