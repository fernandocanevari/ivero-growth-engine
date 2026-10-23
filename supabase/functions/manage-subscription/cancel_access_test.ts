import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decideCancelAccess } from "./cancel-access.ts";

const NOW = new Date("2026-10-23T17:00:00.000Z");
const TRIAL_END = "2026-10-28T16:47:17.205Z";
const SIGNUP_PLUS_30 = "2026-11-20T16:47:17.205Z";

Deno.test("trial com fim no futuro: acesso até trial_ends_at, grava data_vencimento", () => {
  const d = decideCancelAccess(
    { status: "trial", trial_ends_at: TRIAL_END, data_vencimento: SIGNUP_PLUS_30, ciclos_pagos: 0, counted_payment_ids: [] },
    NOW,
  );
  assertEquals(d, { isTrial: true, accessUntil: TRIAL_END, dataVencimento: TRIAL_END, endsNow: false });
});

Deno.test("trial sem trial_ends_at: acesso termina agora", () => {
  const d = decideCancelAccess(
    { status: "trial", trial_ends_at: null, data_vencimento: SIGNUP_PLUS_30, ciclos_pagos: 0 },
    NOW,
  );
  assertEquals(d, { isTrial: true, accessUntil: NOW.toISOString(), dataVencimento: NOW.toISOString(), endsNow: true });
});

Deno.test("trial já vencido: acesso termina agora", () => {
  const d = decideCancelAccess(
    { status: "trial", trial_ends_at: "2026-10-20T00:00:00.000Z", data_vencimento: SIGNUP_PLUS_30, ciclos_pagos: 0 },
    NOW,
  );
  assertEquals(d.isTrial, true);
  assertEquals(d.endsNow, true);
  assertEquals(d.dataVencimento, NOW.toISOString());
});

Deno.test("assinatura paga: data_vencimento intacta, isTrial false", () => {
  const d = decideCancelAccess(
    { status: "ativo", trial_ends_at: null, data_vencimento: SIGNUP_PLUS_30, ciclos_pagos: 1, counted_payment_ids: ["pay_1"] },
    NOW,
  );
  assertEquals(d, { isTrial: false, accessUntil: SIGNUP_PLUS_30, endsNow: false });
});

Deno.test("status trial com pagamento já contado é tratado como pago", () => {
  const byCycles = decideCancelAccess(
    { status: "trial", trial_ends_at: TRIAL_END, data_vencimento: SIGNUP_PLUS_30, ciclos_pagos: 1 },
    NOW,
  );
  const byCounted = decideCancelAccess(
    { status: "trial", trial_ends_at: TRIAL_END, data_vencimento: SIGNUP_PLUS_30, ciclos_pagos: 0, counted_payment_ids: ["pay_1"] },
    NOW,
  );
  assertEquals(byCycles.isTrial, false);
  assertEquals(byCycles.dataVencimento, undefined);
  assertEquals(byCounted.isTrial, false);
  assertEquals(byCounted.dataVencimento, undefined);
});
