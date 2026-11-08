import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { discoverCheckoutBinding } from "./checkout-binding.ts";
import { row, subscription } from "./checkout-binding-test-harness.ts";
for (const extra of [{ status: "INACTIVE" }, { value: 397 }, { id: "sub_old" }, { dateCreated: "2026-11-06" }, { dateCreated: null }, { deleted: true }]) {
  Deno.test(`binding rejects ${JSON.stringify(extra)}`, async () => {
    const warnings: unknown[] = [];
    const result = await discoverCheckoutBinding(row(), "cus_new", async (path) => ({ ok: true, data: { data: path.startsWith("/subscriptions?") ? [subscription(extra)] : [], hasMore: false } }), (_, d) => warnings.push(d));
    assertEquals(result, null); assert(warnings.length > 0);
  });
}
Deno.test("pagination ambiguity cannot bind first page", async () => {
  const result = await discoverCheckoutBinding(row(), "cus_new", async (path) => ({ ok: true, data: { data: [subscription({ id: path.includes("offset=0") ? "sub_a" : "sub_b" })], hasMore: path.includes("offset=0") } }), () => {});
  assertEquals(result, null);
});
Deno.test("wrong session payment cannot bind", async () => {
  const result = await discoverCheckoutBinding(row(), null, async () => ({ ok: true, data: { data: [{ subscription: "sub_new", checkoutSession: "wrong" }], hasMore: false } }), () => {});
  assertEquals(result, null);
});