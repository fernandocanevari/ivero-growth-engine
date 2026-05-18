## Problema

No `/dashboard`, o card "Por onde começar" (anexo 1) aparece por ~1s e é substituído pelo botão "Reexibir checklist" (anexo 2).

## Causa

Em `src/components/dashboard/OnboardingChecklistCard.tsx`:

- O estado `snoozedUntil` começa em `0`, então no primeiro render o componente assume "não está snoozed" e mostra o card completo.
- Só depois o `useEffect` busca o `userId` via `supabase.auth.getUser()` e lê `localStorage` (`ivero_dashboard_checklist_snoozed_until:<userId>`). Se houver um snooze válido (provavelmente o usuário clicou no "X" ou em "Lembrar daqui a 7 dias" em uma sessão anterior), o estado é atualizado e o componente troca para o botão "Reexibir checklist".

Resultado: flash do card antes do estado de snooze ser conhecido.

## Correção

Adicionar um flag `snoozeChecked` (boolean) inicializado em `false`. Só renderizar qualquer coisa depois que:
1. `isLoading` do progresso terminou, e
2. `snoozeChecked === true` (ou seja, já consultamos `auth.getUser()` + `localStorage`).

Enquanto isso, retornar `null` (não renderizar nada) para evitar o flash. No `useEffect`, marcar `snoozeChecked = true` ao final, inclusive no caminho "sem user" (para não travar o render quando o usuário não está logado, embora aqui o componente sempre seja usado autenticado).

## Arquivo afetado

- `src/components/dashboard/OnboardingChecklistCard.tsx` — adicionar estado `snoozeChecked`, setá-lo dentro do `useEffect`, e bloquear render (`return null`) até `snoozeChecked && !isLoading && progress`.

## Observação extra

Se o usuário não lembra de ter ocultado, vale também confirmar via DevTools (`Application → Local Storage`) se existe a chave `ivero_dashboard_checklist_snoozed_until:<userId>` — se sim, basta apagar (ou clicar em "Reexibir checklist") para o card voltar permanentemente até o próximo snooze.
