import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OverdueNoticeView } from "@/components/dashboard/OverdueNotice";

const overdue = { id: "pay_1", value: 497, dueDate: "2026-10-10", invoiceUrl: "https://invoice.invalid/pay_1" };
const CARENCIA = "2026-10-14T02:59:59.999Z";

describe("aviso de mensalidade vencida", () => {
  it("em tolerância mostra o texto e o botão Pagar agora com a fatura vencida", () => {
    render(<OverdueNoticeView overdue={overdue} carenciaAte={CARENCIA} inGrace />);
    expect(screen.getByTestId("overdue-grace").textContent).toContain("Seu acesso continua normal até 13/10");
    expect(screen.getByRole("link", { name: /Pagar agora/ }).getAttribute("href")).toBe(overdue.invoiceUrl);
  });
  it("pausado mostra o texto de acesso pausado", () => {
    render(<OverdueNoticeView overdue={overdue} carenciaAte={CARENCIA} inGrace={false} />);
    expect(screen.getByTestId("overdue-blocked").textContent).toContain("Seu acesso está pausado desde 14/10");
    expect(screen.getByRole("link", { name: /Pagar agora/ })).toBeTruthy();
  });
});
