# Corrigir o piscar na causa raiz (não só no card)

Confirmado: é a MESMA fonte já tratada no bug dos cadeados. O menu lateral (`DashboardSidebar`) não resolveu a causa — ele só criou um remendo local (`lastResolved`) para si mesmo. Qualquer outra tela que dependa do mesmo sinal (como o card "Próxima cobrança") continua piscando.

Então a correção vai na origem, e o remendo local do menu deixa de ser necessário.

## O que muda

1. **Consulta de permissões (useUserRole)**
   - Passa a considerar "carregando" apenas a PRIMEIRA carga. Revalidações em segundo plano (voltar o foco da aba, trocar de janela) não voltam mais a dizer "carregando".
   - Os dados ganham validade de alguns minutos, então voltar para a aba não refaz a consulta do zero.
   - Expõe também um sinal separado de "revalidando", para quem quiser usar.

2. **Status da assinatura (useSubscriptionStatus)**
   - Recarregar em segundo plano mantém o último status conhecido em tela em vez de voltar ao estado "carregando" (só a primeira carga é "carregando").

3. **Faturas (useBillingInvoices)**
   - Ao recarregar (por exemplo depois de mudar de plano), mantém a lista e a próxima cobrança já exibidas até chegar o dado novo, em vez de esvaziar e mostrar esqueleto.

4. **Menu lateral**
   - Mantém o comportamento atual, apoiado agora na correção de origem; o remendo `lastResolved` fica simplificado/removido sem mudar nada visualmente.

Nada de preço, regra de cobrança, ciclo mensal/anual, proporcional de upgrade ou copy é tocado.

## Detalhes técnicos

- `useUserRole`: `isLoading` deixa de somar `query.isFetching`; passa a ser `!authResolved || (userId !== null && query.isPending)`. Adicionar `staleTime: 5 * 60 * 1000` (mesmo valor já usado nas telas de admin) e `placeholderData: (prev) => prev`. Novo retorno `isValidating` para casos que realmente precisem.
- `useSubscriptionStatus`: `fetchAssinatura` só liga `assinaturaLoading` quando ainda não há linha carregada (ref `hasLoadedRef`); em recargas mantém `assinatura` anterior até a resposta. Em erro, preserva o último valor em vez de zerar (mantendo `null` apenas se nunca houve dado).
- `useBillingInvoices`: `load` deixa de limpar `invoices`/`next` e de ligar `isLoading` quando já houve uma carga; usa `isValidating` separado. `AssinaturaPage` continua consumindo `isLoading`.
- `DashboardSidebar`: remover o bloco `lastResolved`/`validating` e usar os valores diretos; `showLockState` passa a depender apenas de `!isAdmin && !roleLoading` (primeira carga).
- Cobertura: rodar a suíte existente (inclui `useAuthLoadingWindow.test.tsx`, `DashboardSidebar.test.tsx`) e adicionar um teste que simula retorno de foco da janela e verifica que `isLoading` não volta a `true`.

## Verificação

- Teste automatizado de retorno de foco (o mesmo cenário que reproduziu o piscar).
- Navegação real em `/dashboard/assinatura`: alternar de aba e voltar várias vezes, confirmando que nenhum card pisca (nem "Plano Atual", nem "Próxima Cobrança", nem histórico de faturas) e que os cadeados do menu seguem estáveis.
