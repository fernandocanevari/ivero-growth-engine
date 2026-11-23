/**
 * P45 — a tela de assinatura se atualiza sozinha depois de pagar o upgrade em
 * outra aba: retorno à aba, polling do pedido pendente e aviso compartilhado.
 * Usa o hook REAL com o banco simulado.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import React from "react";

type Row = Record<string, unknown>;
const DB: { rows: Record<string, Row>; calls: string[]; delay: number } = { rows: {}, calls: [], delay: 0 };
const AUTH: { user: string | null; cb: ((e: string, s: unknown) => void) | null } = { user: "A", cb: null };

vi.mock("@/integrations/supabase/client", () => {
  const from = (_t: string) => {
    let uid = "";
    const q = {
      select: () => q,
      eq: (_c: string, v: string) => { uid = v; return q; },
      order: () => q,
      limit: () => q,
      maybeSingle: async () => {
        DB.calls.push(uid);
        const snapshot = DB.rows[uid] ? { ...DB.rows[uid] } : null;
        if (DB.delay) await new Promise((r) => setTimeout(r, DB.delay));
        return { data: snapshot, error: null };
      },
    };
    return q;
  };
  return {
    supabase: {
      from,
      functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
      auth: {
        getUser: async () => ({ data: { user: AUTH.user ? { id: AUTH.user } : null } }),
        onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
          AUTH.cb = cb;
          return { data: { subscription: { unsubscribe: () => { AUTH.cb = null; } } } };
        },
      },
    },
  };
});
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isAdmin: false, isLoading: false }) }));
vi.mock("@/lib/brand-scope", () => ({ getBrandScope: async () => null, subscribeBrandScope: () => () => {} }));
vi.mock("react-router-dom", () => ({ Navigate: () => null, useSearchParams: () => [new URLSearchParams("")] }));
vi.mock("framer-motion", () => ({
  motion: { div: ({ initial: _i, animate: _a, transition: _t, ...p }: Record<string, unknown>) => <div {...(p as React.ComponentProps<"div">)} /> },
}));
vi.mock("@/hooks/useAccountType", () => ({ useAccountType: () => ({ isAgency: false, isLoading: false }) }));
const reload = vi.fn(async () => {});
vi.mock("@/hooks/useBillingInvoices", () => ({
  useBillingInvoices: () => ({ invoices: [], next: { id: "pay_n", billingType: "CREDIT_CARD", status: "PENDING", value: 1497, dueDate: "2026-12-10" }, overdue: null, isLoading: false, reload }),
  INVOICE_STATUS_LABEL: {},
}));
vi.mock("@/hooks/useUpgradeEntry", () => ({ useUpgradeEntry: () => ({ openUpgrade: vi.fn() }) }));
vi.mock("@/components/dashboard/UpgradeModal", () => ({ UpgradeModal: () => null }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/lib/reconcile-pending", () => ({ reconcilePendingPayment: async () => null }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import AssinaturaPage from "./AssinaturaPage";
import { useSubscriptionStatus, notifySubscriptionChanged } from "@/hooks/useSubscriptionStatus";

const NOW = new Date("2026-11-14T12:00:00Z");
const base = (over: Row = {}): Row => ({
  plano: "influencia", status: "ativo", carencia_ate: null, trial_ends_at: null,
  data_vencimento: "2026-12-10T02:59:59.999Z", asaas_subscription_id: "sub_x",
  ciclo_contratado: "mensal", ciclos_pagos: 2, counted_payment_ids: ["p1", "p2"],
  compromisso_inicio: null, compromisso_meses: 12, plano_pretendido: null,
  upgrade_pendente_plano: null, upgrade_pendente_diferenca: null,
  upgrade_pendente_invoice_url: null, upgrade_pendente_em: null, ...over,
});
const pending = () => base({
  upgrade_pendente_plano: "autoridade", upgrade_pendente_diferenca: 300,
  upgrade_pendente_invoice_url: "https://asaas.test/i/dif", upgrade_pendente_em: "2026-11-14T10:00:00Z",
});
const paid = () => base({ plano: "autoridade" });

const text = () => (document.body.textContent ?? "").replace(/\u00a0/g, " ");
const card = () => screen.queryByTestId("upgrade-pending-card");
const flush = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
let visibility: "visible" | "hidden" = "visible";
const setVisible = (v: "visible" | "hidden") => { visibility = v; };
const fireVisible = () => { setVisible("visible"); document.dispatchEvent(new Event("visibilitychange")); };

function Sidebar() {
  const s = useSubscriptionStatus();
  return <div data-testid="sidebar">{s.isLoading ? "loading" : `plano:${s.plano}`}</div>;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
  DB.rows = { A: pending() }; DB.calls = []; DB.delay = 0;
  AUTH.user = "A";
  reload.mockClear();
  setVisible("visible");
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

async function mount(ui: React.ReactElement = <AssinaturaPage />) {
  const r = render(ui);
  await flush();
  return r;
}

describe("P45 — retorno à aba", () => {
  it("1. card some e plano/preço atualizam, sem estado de teste grátis em nenhum render", async () => {
    const bad: string[] = [];
    const obs = new MutationObserver(() => {
      for (const t of ["Teste grátis", "Plano —", "Nenhum cartão cadastrado ainda"]) if (text().includes(t)) bad.push(t);
    });
    await mount();
    obs.observe(document.body, { subtree: true, childList: true, characterData: true });
    expect(card()).not.toBeNull();
    const before = text();
    DB.rows.A = paid();
    fireVisible();
    await flush();
    obs.disconnect();
    expect(card()).toBeNull();
    expect(text()).not.toBe(before);
    expect(text()).toContain("Autoridade");
    expect(text()).toContain("1.497");
    expect(bad).toEqual([]);
  });

  it("2. focus + visibilitychange e novo retorno em < 10 s = uma recarga; após 10 s recarrega de novo", async () => {
    await mount();
    const start = DB.calls.length;
    fireVisible(); window.dispatchEvent(new Event("focus"));
    await flush();
    await flush(3_000);
    fireVisible();
    await flush();
    expect(reload).toHaveBeenCalledTimes(1);
    const afterFirst = DB.calls.length - start;
    expect(afterFirst).toBeGreaterThan(0);
    await flush(7_100);
    const mid = DB.calls.length;
    fireVisible();
    await flush();
    expect(reload).toHaveBeenCalledTimes(2);
    expect(DB.calls.length).toBeGreaterThan(mid);
  });
});

describe("P45 — polling do upgrade pendente", () => {
  it("4. 8 s por tick, para quando o pedido some e recarrega as cobranças uma vez", async () => {
    await mount();
    const c0 = DB.calls.length;
    await flush(8_000);
    expect(DB.calls.length).toBeGreaterThan(c0);
    const c1 = DB.calls.length;
    await flush(8_000);
    expect(DB.calls.length).toBeGreaterThan(c1);
    expect(reload).not.toHaveBeenCalled();
    DB.rows.A = paid();
    await flush(8_000);
    expect(card()).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
    const c2 = DB.calls.length;
    await flush(60_000);
    expect(DB.calls.length).toBe(c2);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("4. sem pedido pendente não há polling", async () => {
    DB.rows.A = paid();
    await mount();
    const c = DB.calls.length;
    await flush(60_000);
    expect(DB.calls.length).toBe(c);
  });

  it("4. para aos 10 minutos", async () => {
    await mount();
    await flush(600_000);
    const c = DB.calls.length;
    await flush(80_000);
    expect(DB.calls.length).toBe(c);
  });

  it("4. aba escondida pula os ticks", async () => {
    await mount();
    setVisible("hidden");
    const c = DB.calls.length;
    await flush(40_000);
    expect(DB.calls.length).toBe(c);
  });

  it("4. nunca duas leituras ao mesmo tempo", async () => {
    await mount();
    DB.delay = 20_000; // leitura mais lenta que o intervalo
    const c = DB.calls.length;
    await flush(8_000); // 1º tick inicia leitura (página + aviso)
    const started = DB.calls.length - c;
    await flush(8_000); // tick seguinte é pulado
    expect(DB.calls.length - c).toBe(started);
  });
});

describe("P45 — aviso compartilhado", () => {
  it("5. sidebar mostra autoridade depois que a página recarrega, sem outro gatilho", async () => {
    DB.rows.A = base();
    await mount(<><AssinaturaPage /><Sidebar /></>);
    expect(screen.getByTestId("sidebar").textContent).toBe("plano:influencia");
    DB.rows.A = paid();
    fireVisible();
    await flush();
    expect(screen.getByTestId("sidebar").textContent).toBe("plano:autoridade");
  });

  it("5. instância que reage não avisa de novo e não sobra ouvinte após desmontar", async () => {
    DB.rows.A = base();
    const r = await mount(<><Sidebar /><Sidebar /></>);
    const c = DB.calls.length;
    act(() => notifySubscriptionChanged());
    await flush();
    expect(DB.calls.length - c).toBe(2); // uma leitura por instância, sem laço
    r.unmount();
    const c2 = DB.calls.length;
    act(() => notifySubscriptionChanged());
    await flush();
    expect(DB.calls.length).toBe(c2);
  });

  it("5. leituras sobrepostas: só a última grava", async () => {
    DB.rows.A = base();
    await mount(<Sidebar />);
    DB.delay = 5_000;
    DB.rows.A = base({ plano: "presenca" });
    act(() => notifySubscriptionChanged()); // lenta, dado antigo
    DB.delay = 1_000;
    DB.rows.A = paid();
    act(() => notifySubscriptionChanged()); // rápida, dado novo
    await flush(1_000);
    expect(screen.getByTestId("sidebar").textContent).toBe("plano:autoridade");
    await flush(5_000);
    expect(screen.getByTestId("sidebar").textContent).toBe("plano:autoridade");
  });
});

describe("P45 — troca de conta", () => {
  it("6. B nunca vê dado de A e nada recarrega para A depois", async () => {
    DB.rows = { A: base(), B: base({ plano: "presenca" }) };
    const seen: string[] = [];
    function Spy() { const s = useSubscriptionStatus(); if (!s.isLoading) seen.push(`${AUTH.user}:${s.plano}`); return null; }
    await mount(<Spy />);
    DB.delay = 3_000;
    act(() => notifySubscriptionChanged()); // leitura lenta de A em voo
    AUTH.user = "B";
    act(() => AUTH.cb?.("SIGNED_IN", { user: { id: "B" } }));
    const callsAt = DB.calls.length;
    await flush(5_000);
    expect(seen.filter((s) => s.startsWith("B:"))).not.toContain("B:influencia");
    expect(seen[seen.length - 1]).toBe("B:presenca");
    act(() => notifySubscriptionChanged());
    await flush(5_000);
    expect(DB.calls.slice(callsAt)).not.toContain("A");
  });
});
