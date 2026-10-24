import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useBillingInvoices, type OverdueInvoice } from "@/hooks/useBillingInvoices";
import {
  overdueBlockedText, overdueGraceText, PAY_NOW_LABEL,
} from "@/lib/overdue-copy";

/** Aviso de mensalidade vencida: em tolerância ou com acesso pausado. */
export function OverdueNoticeView({
  overdue, carenciaAte, inGrace,
}: { overdue: OverdueInvoice; carenciaAte: string | null; inGrace: boolean }) {
  const text = inGrace
    ? overdueGraceText(overdue.value, overdue.dueDate, carenciaAte)
    : overdueBlockedText(overdue.value, carenciaAte);
  return (
    <div
      role="alert"
      data-testid={inGrace ? "overdue-grace" : "overdue-blocked"}
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
      <p className="text-sm text-foreground flex-1">{text}</p>
      {overdue.invoiceUrl && (
        <Button asChild size="sm" className="shrink-0">
          <a href={overdue.invoiceUrl} target="_blank" rel="noopener noreferrer">
            {PAY_NOW_LABEL}
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </a>
        </Button>
      )}
    </div>
  );
}

/** Busca a fatura vencida só para quem está inadimplente. */
function OverdueNoticeLoader({ carenciaAte, inGrace }: { carenciaAte: string | null; inGrace: boolean }) {
  const { overdue } = useBillingInvoices();
  if (!overdue) return null;
  return <OverdueNoticeView overdue={overdue} carenciaAte={carenciaAte} inGrace={inGrace} />;
}

/** Aviso do dashboard (aparece só durante a tolerância). */
export function DashboardOverdueNotice() {
  const { effectiveStatus, carenciaAte, isPaid } = useSubscriptionStatus();
  if (effectiveStatus !== "inadimplente" || !isPaid) return null;
  return <OverdueNoticeLoader carenciaAte={carenciaAte} inGrace />;
}
