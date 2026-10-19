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
  const currentCycleUnpaid = args.pendingPayments.some((p) => {
    const day = prorationDay(p.dueDate);
    return p.status === "PENDING" && !!day && !!today && day <= today;
  });
  // Asaas advances subscription.nextDueDate one cycle ahead once the next
  // charge exists; the earliest future PENDING charge is the real cycle end.
  const futurePending = today
    ? args.pendingPayments
      .filter((p) => p.status === "PENDING")
      .map((p) => prorationDay(p.dueDate))
      .filter((day): day is string => !!day && day > today)
      .sort()
    : [];
  const referenceSource: "pending" | "subscription" = futurePending.length > 0 ? "pending" : "subscription";
  const due = futurePending.length > 0 ? futurePending[0] : prorationDay(args.nextDueDate);
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
  return { proRataValue, daysLeft, currentCycleUnpaid, reason, referenceDue: due, referenceSource };
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

const OPEN_STATUSES = ["PENDING", "OVERDUE"];
const VOID_STATUSES = ["CANCELLED", "CANCELED", "DELETED"];
const PAID_STATUSES = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "DUNNING_RECEIVED"];
export const MAX_PRORATION_REFERENCE_ATTEMPTS = 20;

/** Attempt 1 keeps the base reference; later attempts append ":2", ":3"... (prefix preserved). */
export const prorationReference = (base: string, attempt: number) => attempt <= 1 ? base : `${base}:${attempt}`;

export interface ProrationInvoiceLookup {
  status: "clear" | "reused" | "lookup_failed" | "unresolved_status" | "attempts_exhausted";
  payment?: ProrationPayment;
  /** Reference to reuse or to send on the new charge. */
  externalReference: string;
  referenceAttempt: number;
}

/**
 * Reuses only an OPEN (PENDING/OVERDUE) identical charge. A paid charge never
 * satisfies a new request: the next numeric suffix is tried. Any other live
 * status (risk analysis, refund, chargeback...) or a failed lookup fails
 * closed — no charge is created rather than risking duplication.
 */
export async function findProrationInvoice(call: AsaasCall, args: {
  externalReference: string; customerId: string; value: number;
}): Promise<ProrationInvoiceLookup> {
  for (let attempt = 1; attempt <= MAX_PRORATION_REFERENCE_ATTEMPTS; attempt++) {
    const externalReference = prorationReference(args.externalReference, attempt);
    let rows: ProrationPayment[];
    try {
      rows = await listProrationPayments(call, `/payments?externalReference=${encodeURIComponent(externalReference)}&customer=${encodeURIComponent(args.customerId)}`);
    } catch { return { status: "lookup_failed", externalReference, referenceAttempt: attempt }; }
    const live = rows.filter((p) => p.externalReference === externalReference && p.customer === args.customerId &&
      !p.deleted && !VOID_STATUSES.includes(String(p.status).toUpperCase()));
    const status = (p: ProrationPayment) => String(p.status).toUpperCase();
    const open = live.find((p) => OPEN_STATUSES.includes(status(p)) && Number(p.value) === args.value);
    if (open) return { status: "reused", payment: open, externalReference, referenceAttempt: attempt };
    const closed = live.filter((p) => !OPEN_STATUSES.includes(status(p)));
    if (closed.length === 0) return { status: "clear", externalReference, referenceAttempt: attempt };
    if (closed.some((p) => !PAID_STATUSES.includes(status(p)))) {
      return { status: "unresolved_status", externalReference, referenceAttempt: attempt };
    }
    // Every closed charge on this reference is paid: try the next suffix.
  }
  return {
    status: "attempts_exhausted",
    externalReference: prorationReference(args.externalReference, MAX_PRORATION_REFERENCE_ATTEMPTS),
    referenceAttempt: MAX_PRORATION_REFERENCE_ATTEMPTS,
  };
}