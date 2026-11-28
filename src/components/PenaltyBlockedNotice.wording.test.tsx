// P64 — aviso fixo sem "multa".
import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/lib/penalty-flow", () => ({ payPenaltyAndOpen: vi.fn(async () => "opened") }));
import { PenaltyBlockedNotice } from "./PenaltyBlockedNotice";

it("botão 'Pagar diferença' e nenhum 'multa' no texto", () => {
  render(<PenaltyBlockedNotice valor={200} />);
  expect(screen.getByRole("button", { name: "Pagar diferença" })).toBeInTheDocument();
  expect(screen.getByTestId("penalty-blocked-notice").textContent ?? "").not.toMatch(/multa/i);
});
