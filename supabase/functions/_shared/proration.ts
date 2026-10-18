/** Calendar days in Brasília; plain provider dates are already calendar days. */
export function prorationDay(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(parsed);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export interface ProrationPayment {
  status?: string;
  dueDate?: string | null;
  id?: string;
  value?: number;
  customer?: string;
  externalReference?: string;
  deleted?: boolean;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
}

export function decideProration(args: {
  delta: number; nextDueDate: string | null; pendingPayments: ProrationPayment[];
  today: string | Date; cycleDays: number;
}) {
  const today = prorationDay(args.today);
  const due = prorationDay(args.nextDueDate);
  const currentCycleUnpaid = args.pendingPayments.some((p) => {
    const day = prorationDay(p.dueDate);
    return p.status === "PENDING" && !!day && !!today && day <= today;
  });
  const daysLeft = today && due && args.cycleDays > 0
    ? Math.max(0, Math.min(args.cycleDays, Math.round((Date.parse(due) - Date.parse(today)) / 86_400_000)))
    : 0;
  let reason = "charged";
  let proRataValue = 0;
  if (args.delta <= 0) reason = "no_increase";
  else if (currentCycleUnpaid) reason = "current_cycle_open";
  else if (!due || !today || !Number.isFinite(args.cycleDays) || args.cycleDays <= 0 || !Number.isFinite(args.delta)) reason = "no_next_due";
  else {
    proRataValue = Math.round(args.delta * daysLeft / args.cycleDays * 100) / 100;
    if (proRataValue < 5) { proRataValue = 0; reason = "below_minimum"; }
  }
  return { proRataValue, daysLeft, currentCycleUnpaid, reason };
}

type AsaasCall = (path: string) => Promise<{ ok: boolean; json: Record<string, any> | null }>;

/** Fail closed on unavailable/incomplete lists: never assume no open invoice. */
export async function listProrationPayments(call: AsaasCall, path: string): Promise<ProrationPayment[]> {
  const rows: ProrationPayment[] = [];
  for (let offset = 0; ; offset += 100) {
    const result = await call(`${path}${path.includes("?") ? "&" : "?"}limit=100&offset=${offset}`);
    if (!result.ok || !Array.isArray(result.json?.data)) throw new Error("proration_payment_lookup_failed");
    rows.push(...result.json.data);
    if (!result.json?.hasMore) return rows;
    if (result.json.data.length === 0 || offset >= 9900) throw new Error("proration_payment_lookup_incomplete");
  }
}

/** Existing invoice reuse; lookup failure suppresses POST rather than risking duplication. */
export async function findProrationInvoice(call: AsaasCall, args: {
  externalReference: string; customerId: string; value: number;
}): Promise<{ status: "clear" | "reused" | "lookup_failed"; payment?: ProrationPayment }> {
  try {
    const rows = await listProrationPayments(call, `/payments?externalReference=${encodeURIComponent(args.externalReference)}&customer=${encodeURIComponent(args.customerId)}`);
    const payment = rows.find((p) => p.externalReference === args.externalReference &&
      p.customer === args.customerId && Number(p.value) === args.value && !p.deleted &&
      !["CANCELLED", "CANCELED", "DELETED"].includes(String(p.status).toUpperCase()));
    return payment ? { status: "reused", payment } : { status: "clear" };
  } catch { return { status: "lookup_failed" }; }
}