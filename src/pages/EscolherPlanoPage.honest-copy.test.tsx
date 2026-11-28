import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { createFromMock, type TableHandler } from "@/test/supabase-query-mock";

const navigateMock = vi.fn();
let search = "";
let rows: Array<{ status: string; trial_ends_at: string | null }> = [];
const handlers: Record<string, TableHandler> = {
  assinaturas: () => ({ data: rows, error: null }),
};
const fromMock = createFromMock(handlers);
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [new URLSearchParams(search)],
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn() } }));
vi.mock("framer-motion", () => ({
  motion: {
    div: (p: React.ComponentProps<"div">) => <div {...p} />,
    header: (p: React.ComponentProps<"header">) => <header {...p} />,
  },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: {
      id: "p55-copy", email: "copy@example.com", user_metadata: { display_name: "Copy" },
    } } } }) },
    from: (table: string) => fromMock(table),
    functions: { invoke: vi.fn() },
  },
}));

import EscolherPlanoPage from "./EscolherPlanoPage";

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.reset();
  localStorage.clear();
  rows = [];
  search = "";
});

const cases = [
  {
    trial: true, annual: false,
    subtitle: "Comece com 7 dias grátis. No plano mensal, cancele quando quiser.",
    description: "Você terá 7 dias grátis antes da primeira cobrança. No plano mensal, cancele quando quiser.",
  },
  {
    trial: true, annual: true,
    subtitle: "Comece com 7 dias grátis. O plano anual tem compromisso de 12 meses no preço promocional e se renova a cada 12 meses; antes de cada renovação você pode cancelar sem cobrança extra.",
    description: "Você terá 7 dias grátis antes da primeira cobrança, e cancelar nesse período não custa nada. Depois, o plano anual tem compromisso de 12 meses no preço promocional e se renova a cada 12 meses; antes de cada renovação você pode cancelar sem cobrança extra.",
  },
  {
    trial: false, annual: false,
    subtitle: "A cobrança é feita agora. No plano mensal, cancele quando quiser.",
    description: "A cobrança do plano Presença será feita agora, no valor de R$ 497. No plano mensal, cancele quando quiser.",
  },
  {
    trial: false, annual: true,
    subtitle: "A cobrança é feita agora. O plano anual tem compromisso de 12 meses no preço promocional e se renova a cada 12 meses; antes de cada renovação você pode cancelar sem cobrança extra.",
    description: "A cobrança do plano Presença será feita agora, no valor de R$ 397 por mês. O plano anual tem compromisso de 12 meses no preço promocional e se renova a cada 12 meses; antes de cada renovação você pode cancelar sem cobrança extra.",
  },
];

describe("P55 — escolha e confirmação", () => {
  it.each(cases)("trial=$trial, annual=$annual: explica cobrança e compromisso", async ({ trial, annual, subtitle, description }) => {
    if (!trial) rows = [{ status: "expirado", trial_ends_at: "2026-01-01T00:00:00Z" }];
    render(<EscolherPlanoPage />);
    await waitFor(() => expect(screen.queryByText("Carregando...")).not.toBeInTheDocument());
    if (annual) await userEvent.click(screen.getByRole("button", { name: /Anual/ }));
    const subtitleElement = screen.getByText(subtitle);
    expect(subtitleElement).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: trial ? "Começar com 7 dias grátis →" : "Assinar plano →" })[0]);
    const dialog = await screen.findByRole("dialog", { name: "Confirmar assinatura" });
    const descriptionElement = within(dialog).getByText(description);
    expect(descriptionElement).toBeInTheDocument();
    expect(`${subtitleElement.textContent} ${descriptionElement.textContent}`).not.toMatch(/bordo|multa/i);
    if (annual) expect(`${subtitleElement.textContent} ${descriptionElement.textContent}`).toMatch(/se renova a cada 12 meses/);
    else expect(`${subtitleElement.textContent} ${descriptionElement.textContent}`).not.toMatch(/renova/);
    expect(`${subtitleElement.textContent} ${descriptionElement.textContent}`).not.toMatch(/voo/i);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("mantém o subtítulo trialExpirado nos dois ciclos", async () => {
    search = "motivo=trial_expirado";
    rows = [{ status: "expirado", trial_ends_at: "2026-01-01T00:00:00Z" }];
    render(<EscolherPlanoPage />);
    const original = "Você já sabe que sua marca aparece nas IAs com a Ivero. Assine agora para aparecer ainda mais e na frente do seu concorrente.";
    expect(await screen.findByText(original)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Anual/ }));
    expect(screen.getByText(original)).toBeInTheDocument();
  });
});