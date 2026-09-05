import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useBillingInvoices — faturas reais vindas do Asaas via manage-subscription.
 * Sem vínculo com o Asaas ainda (trial/pendente) a lista volta vazia.
 */

export interface BillingInvoice {
  id: string;
  dueDate: string | null;
  value: number;
  status: string;
  invoiceUrl: string | null;
  receiptUrl: string | null;
  billingType: string | null;
}

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando pagamento",
  AWAITING_RISK_ANALYSIS: "Em análise",
  CONFIRMED: "Confirmada",
  RECEIVED: "Paga",
  RECEIVED_IN_CASH: "Paga",
  OVERDUE: "Vencida",
  REFUNDED: "Reembolsada",
  REFUND_REQUESTED: "Reembolso solicitado",
  CHARGEBACK_REQUESTED: "Chargeback",
  DELETED: "Removida",
};

export function useBillingInvoices() {
  // Gate de auth: chamar list_invoices antes da sessão resolver devolve erro e
  // pinta o card com o branch de fallback (flash). Esperamos o getUser().
  const [authResolved, setAuthResolved] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setHasUser(!!data.user);
      setAuthResolved(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && event !== "SIGNED_OUT") return;
      setHasUser(!!session?.user);
      setAuthResolved(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [next, setNext] = useState<BillingInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Recargas (troca de plano, retorno do checkout) são revalidação: mantêm o
  // que já está em tela em vez de esvaziar e mostrar skeleton de novo.
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!authResolved) return; // mantém isLoading = true até a sessão resolver
    if (!hasUser) {
      setInvoices([]);
      setNext(null);
      hasLoadedRef.current = true;
      setIsLoading(false);
      return;
    }
    if (hasLoadedRef.current) setIsValidating(true);
    else setIsLoading(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke("manage-subscription", {
      body: { action: "list_invoices" },
    });
    if (fnError || data?.error) {
      setError(fnError?.message ?? data?.error ?? "Erro ao carregar faturas.");
      if (!hasLoadedRef.current) {
        setInvoices([]);
        setNext(null);
      }
    } else {
      setInvoices((data?.invoices ?? []) as BillingInvoice[]);
      setNext((data?.next ?? null) as BillingInvoice | null);
    }
    hasLoadedRef.current = true;
    setIsValidating(false);
    setIsLoading(false);
  }, [authResolved, hasUser]);

  useEffect(() => {
    void load();
  }, [load]);

  return { invoices, next, isLoading, isValidating, error, reload: load };
}
