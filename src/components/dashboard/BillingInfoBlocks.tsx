// Blocos de informação compartilhados pelos cards "Upgrade em andamento" e
// "Você escolheu o plano" da página Assinatura (únicos consumidores).
export const BILLING_CARD_CTA_CLASS = "w-full sm:w-auto shrink-0 h-11 px-6 font-semibold shadow-md";

export interface BillingInfoBlock { id: string; label: string; value: string }

export function BillingInfoBlocks({ blocks, borderClassName, testIdPrefix }: {
  blocks: BillingInfoBlock[];
  borderClassName: string;
  testIdPrefix: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-3 ${blocks.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {blocks.map((b) => (
        <div key={b.id} className={`rounded-lg border ${borderClassName} bg-background px-4 py-3`} data-testid={`${testIdPrefix}-${b.id}`}>
          <p className="text-xs text-muted-foreground">{b.label}</p>
          <p className="text-lg font-semibold text-foreground">{b.value}</p>
        </div>
      ))}
    </div>
  );
}
