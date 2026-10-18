import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decideProration, findProrationInvoice, listProrationPayments } from "../_shared/proration.ts";

const base = { delta: 497, nextDueDate: "2026-11-17", today: "2026-10-18", cycleDays: 30, pendingPayments: [] };
Deno.test("paid current cycle: future pending does not block R$497", () => {
  assertEquals(decideProration({ ...base, pendingPayments: [{ status: "PENDING", dueDate: "2026-11-17" }] }),
    { proRataValue: 497, daysLeft: 30, currentCycleUnpaid: false, reason: "charged" });
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