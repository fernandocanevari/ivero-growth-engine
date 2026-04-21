import { useUserRole } from "./useUserRole";

/**
 * useSubscriptionStatus — fonte da verdade sobre o estado da assinatura.
 *
 * Hoje (sem gateway de pagamento integrado):
 *  - Todos os usuários autenticados não-admin são tratados como em TRIAL.
 *  - Admins têm acesso total (isPaid = true) para não atrapalhar gestão interna.
 *
 * Futuro (quando plugarmos Stripe/Paddle):
 *  - Substituir a lógica abaixo por uma query à tabela `subscriptions` e
 *    derivar `isPaid`, `plan`, `trialEndsAt` etc. A interface deste hook
 *    deve permanecer a mesma para evitar refactor em cascata.
 */
export function useSubscriptionStatus() {
  const { isAdmin, isLoading } = useUserRole();

  // Admin é tratado como pago (acesso total).
  const isPaid = isAdmin;
  const isTrial = !isPaid;

  return {
    isTrial,
    isPaid,
    isAdmin,
    isLoading,
  };
}
