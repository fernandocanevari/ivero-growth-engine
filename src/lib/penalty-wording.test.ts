// P64 — textos do cliente sem "multa" (finding 86).
import { describe, it, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
const sonner = vi.hoisted(() => {
  const fn = vi.fn() as unknown as ((...a: unknown[]) => void) & Record<string, ReturnType<typeof vi.fn>>;
  fn.error = vi.fn(); fn.success = vi.fn();
  return fn;
});
vi.mock("sonner", () => ({ toast: sonner }));
vi.mock("@/lib/access-cache", () => ({ invalidateAccessCache: () => {} }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
}));

import { penaltyBlockedMessage, reactivateBlockedHelper } from "@/lib/penalty";
import { payPenaltyAndOpen, showPenaltyBlocked } from "@/lib/penalty-flow";

const nb = (s: string) => s.replace(/\u00a0/g, " ");

describe("P64 — diferença do desconto anual", () => {
  beforeEach(() => { invoke.mockReset(); vi.clearAllMocks(); });

  it("penaltyBlockedMessage (item 5)", () => {
    expect(nb(penaltyBlockedMessage(600))).toBe(
      "Para assinar de novo, falta pagar a diferença do desconto anual do plano anterior: R$ 600,00.",
    );
  });
  it("reactivateBlockedHelper", () => {
    expect(nb(reactivateBlockedHelper(100))).toBe("Para reativar, pague antes a diferença de R$ 100,00.");
  });
  it("toast de pagamento confirmado (item 7)", async () => {
    invoke.mockResolvedValue({ data: { ok: true, paid: true }, error: null });
    await payPenaltyAndOpen();
    expect(sonner.success).toHaveBeenCalledWith("Diferença paga. Você já pode assinar de novo.");
  });
  it("toast sem pendência (item 8)", async () => {
    invoke.mockResolvedValue({ data: { ok: true, nothing_pending: true }, error: null });
    await payPenaltyAndOpen();
    expect(sonner.success).toHaveBeenCalledWith("Não há diferença pendente. Você já pode assinar de novo.");
  });
  it("showPenaltyBlocked usa 'Pagar diferença' (item 6)", () => {
    showPenaltyBlocked({ valor: 200 });
    const [msg, opts] = (sonner as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(nb(msg)).not.toMatch(/multa/i);
    expect(opts.action.label).toBe("Pagar diferença");
  });
});
