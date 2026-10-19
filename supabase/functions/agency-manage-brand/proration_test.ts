import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decideProration, findProrationInvoice, listProrationPayments } from "../_shared/proration.ts";

const base = { delta: 497, nextDueDate: "2026-11-17", today: "2026-10-18", cycleDays: 30, pendingPayments: [] };
Deno.test("paid current cycle: future pending does not block R$497", () => {
  assertEquals(decideProration({ ...base, pendingPayments: [{ status: "PENDING", dueDate: "2026-11-17" }] }),
    { proRataValue: 497, daysLeft: 30, currentCycleUnpaid: false, reason: "charged", referenceDue: "2026-11-17", referenceSource: "pending" });
});
Deno.test("pending due today blocks proration", () => {
  assertEquals(decideProration({ ...base, pendingPayments: [{ status: "PENDING", dueDate: "2026-10-18" }] }).reason, "current_cycle_open");
  assertEquals(decideProration({ ...base, pendingPayments: [{ status: "PENDING", dueDate: "2026-10-18" }] }).proRataValue, 0);
});
Deno.test("past pending blocks proration", () => {
  assertEquals(decideProration({ ...base, pendingPayments: [{ status: "PENDING", dueDate: "2026-10-17" }] }).proRataValue, 0);
});
Deno.test("no pending: proportional R$248.50 for 15 days", () => {
  assertEquals(decideProration({ ...base, nextDueDate: "2026-11-02" }).proRataValue, 248.5);
});
Deno.test("downgrade gives no charge or credit", () => {
  assertEquals(decideProration({ ...base, delta: -497 }).reason, "no_increase");
  assertEquals(decideProration({ ...base, delta: -497 }).proRataValue, 0);
});
Deno.test("R$5 minimum: R$4.97 suppressed, R$5 accepted", () => {
  assertEquals(decideProration({ ...base, delta: 4.97 }).proRataValue, 0);
  assertEquals(decideProration({ ...base, delta: 5 }).proRataValue, 5);
});
Deno.test("missing next due returns explicit reason", () => {
  assertEquals(decideProration({ ...base, nextDueDate: null }).reason, "no_next_due");
  assertEquals(decideProration({ ...base, nextDueDate: null }).proRataValue, 0);
});
Deno.test("invalid calendar date returns no_next_due", () => {
  assertEquals(decideProration({ ...base, nextDueDate: "2026-02-30" }).reason, "no_next_due");
});
Deno.test("Brasília boundary: 02:59 UTC still previous day", () => {
  const args = { ...base, pendingPayments: [{ status: "PENDING", dueDate: "2026-10-18" }] };
  assertEquals(decideProration({ ...args, today: new Date("2026-10-18T02:59:59Z") }).currentCycleUnpaid, false);
  assertEquals(decideProration({ ...args, today: new Date("2026-10-18T03:00:00Z") }).currentCycleUnpaid, true);
});
Deno.test("multiple pending: any past item blocks regardless of order", () => {
  assertEquals(decideProration({ ...base, pendingPayments: [{ status: "PENDING", dueDate: "2026-11-17" }, { status: "PENDING", dueDate: "2026-10-17" }] }).proRataValue, 0);
});
Deno.test("monthly 30 vs true annual 365: R$497 vs R$40.85 for 30 days", () => {
  assertEquals(decideProration(base).proRataValue, 497);
  assertEquals(decideProration({ ...base, cycleDays: 365 }).proRataValue, 40.85);
  assertEquals(decideProration({ ...base, cycleDays: 365, nextDueDate: "2027-10-18" }).proRataValue, 497);
});
Deno.test("daysLeft clamped to cycle bounds", () => {
  assertEquals(decideProration({ ...base, nextDueDate: "2026-10-17" }).daysLeft, 0);
  assertEquals(decideProration({ ...base, nextDueDate: "2027-10-18" }).daysLeft, 30);
});
Deno.test("pending pagination reads second page", async () => {
  const paths: string[] = [];
  const rows = await listProrationPayments((path) => {
    paths.push(path);
    return Promise.resolve({ ok: true, json: { data: [{ status: "PENDING", dueDate: paths.length === 1 ? "2026-11-17" : "2026-10-17" }], hasMore: paths.length === 1 } });
  }, "/subscriptions/sub/payments?status=PENDING");
  assertEquals(paths.length, 2);
  assertEquals(paths[1].endsWith("limit=100&offset=100"), true);
  assertEquals(decideProration({ ...base, pendingPayments: rows }).currentCycleUnpaid, true);
});
Deno.test("idempotency reuses identical live invoice", async () => {
  const args = { externalReference: "prorata:sub:agency:brand", customerId: "cus", value: 497 };
  const result = await findProrationInvoice(() => Promise.resolve({ ok: true, json: { data: [{ ...args, customer: "cus", status: "PENDING", invoiceUrl: "https://example.test/invoice" }] } }), args);
  assertEquals(result.status, "reused");
  assertEquals(result.payment?.invoiceUrl, "https://example.test/invoice");
});
Deno.test("cancelled and nonidentical invoices do not suppress new charge", async () => {
  const args = { externalReference: "ref", customerId: "cus", value: 497 };
  const result = await findProrationInvoice(() => Promise.resolve({ ok: true, json: { data: [
    { externalReference: "ref", customer: "cus", value: 497, status: "CANCELLED" },
    { externalReference: "ref", customer: "cus", value: 498, status: "PENDING" },
  ] } }), args);
  assertEquals(result.status, "clear");
});
Deno.test("idempotency lookup failure fails closed", async () => {
  assertEquals((await findProrationInvoice(() => Promise.reject(new Error("offline")), { externalReference: "ref", customerId: "cus", value: 497 })).status, "lookup_failed");
});
// Reference due: earliest future PENDING charge beats the advanced subscription nextDueDate.
const real = { delta: 447.30, cycleDays: 30, nextDueDate: "2026-12-17", pendingPayments: [{ status: "PENDING", dueDate: "2026-11-17" }] };
for (const [today, days, value] of [["2026-10-18", 30, 447.3], ["2026-10-30", 18, 268.38], ["2026-11-10", 7, 104.37], ["2026-11-16", 1, 14.91]] as const) {
  Deno.test(`real log case: today ${today} -> ${days} days, R$${value}`, () => {
    const d = decideProration({ ...real, today });
    assertEquals([d.daysLeft, d.proRataValue, d.referenceDue, d.referenceSource], [days, value, "2026-11-17", "pending"]);
  });
}
Deno.test("no pending charges: falls back to subscription nextDueDate", () => {
  const d = decideProration({ ...real, pendingPayments: [], nextDueDate: "2026-11-17", today: "2026-10-30" });
  assertEquals([d.referenceSource, d.referenceDue, d.daysLeft], ["subscription", "2026-11-17", 18]);
});
Deno.test("pending due today still blocks (unchanged)", () => {
  const d = decideProration({ ...real, pendingPayments: [{ status: "PENDING", dueDate: "2026-11-17" }], today: "2026-11-17" });
  assertEquals([d.currentCycleUnpaid, d.reason, d.proRataValue], [true, "current_cycle_open", 0]);
});
Deno.test("two pending charges: earliest future one is used", () => {
  const d = decideProration({ ...real, today: "2026-10-30", pendingPayments: [{ status: "PENDING", dueDate: "2026-12-17" }, { status: "PENDING", dueDate: "2026-11-17" }] });
  assertEquals([d.referenceDue, d.daysLeft], ["2026-11-17", 18]);
});
// Change 2: reuse only open charges; paid references advance to ":2", ":3"...
const lookupArgs = { externalReference: "prorata:sub:agency:brand", customerId: "cus", value: 497 };
const byRef = (rows: Record<string, Array<Record<string, unknown>>>) => (path: string) => {
  const ref = new URL(`https://x.invalid${path}`).searchParams.get("externalReference")!;
  return Promise.resolve({ ok: true, json: { data: (rows[ref] ?? []).map((r) => ({ externalReference: ref, customer: "cus", value: 497, ...r })), hasMore: false } });
};
for (const status of ["PENDING", "OVERDUE"]) {
  Deno.test(`lookup: existing ${status} is reused on the base reference`, async () => {
    const r = await findProrationInvoice(byRef({ [lookupArgs.externalReference]: [{ status, invoiceUrl: "u" }] }), lookupArgs);
    assertEquals([r.status, r.externalReference, r.referenceAttempt], ["reused", lookupArgs.externalReference, 1]);
  });
}
for (const status of ["RECEIVED", "CONFIRMED"]) {
  Deno.test(`lookup: existing ${status} is never reused -> new charge on ":2"`, async () => {
    const r = await findProrationInvoice(byRef({ [lookupArgs.externalReference]: [{ status }] }), lookupArgs);
    assertEquals([r.status, r.externalReference, r.referenceAttempt, r.payment], ["clear", `${lookupArgs.externalReference}:2`, 2, undefined]);
  });
}
Deno.test("lookup: RECEIVED plus open \":2\" reuses \":2\"", async () => {
  const r = await findProrationInvoice(byRef({
    [lookupArgs.externalReference]: [{ status: "RECEIVED" }],
    [`${lookupArgs.externalReference}:2`]: [{ status: "PENDING", invoiceUrl: "u2" }],
  }), lookupArgs);
  assertEquals([r.status, r.externalReference, r.referenceAttempt, r.payment?.invoiceUrl], ["reused", `${lookupArgs.externalReference}:2`, 2, "u2"]);
});
Deno.test("lookup: paid base and paid \":2\" advances to \":3\"", async () => {
  const r = await findProrationInvoice(byRef({
    [lookupArgs.externalReference]: [{ status: "RECEIVED_IN_CASH" }],
    [`${lookupArgs.externalReference}:2`]: [{ status: "CONFIRMED" }],
  }), lookupArgs);
  assertEquals([r.status, r.externalReference], ["clear", `${lookupArgs.externalReference}:3`]);
});
for (const row of [{ status: "CANCELLED" }, { status: "DELETED" }, { status: "PENDING", deleted: true }]) {
  Deno.test(`lookup: ${JSON.stringify(row)} existing -> creates normally on base reference`, async () => {
    const r = await findProrationInvoice(byRef({ [lookupArgs.externalReference]: [row] }), lookupArgs);
    assertEquals([r.status, r.externalReference, r.referenceAttempt], ["clear", lookupArgs.externalReference, 1]);
  });
}
Deno.test("lookup: failure on a suffix attempt still fails closed", async () => {
  let n = 0;
  const r = await findProrationInvoice((path) => ++n === 1 ? byRef({ [lookupArgs.externalReference]: [{ status: "RECEIVED" }] })(path) : Promise.resolve({ ok: false, json: null }), lookupArgs);
  assertEquals([r.status, r.referenceAttempt], ["lookup_failed", 2]);
});
Deno.test("lookup: non-paid closed status (risk analysis) fails closed", async () => {
  const r = await findProrationInvoice(byRef({ [lookupArgs.externalReference]: [{ status: "AWAITING_RISK_ANALYSIS" }] }), lookupArgs);
  assertEquals(r.status, "unresolved_status");
});
