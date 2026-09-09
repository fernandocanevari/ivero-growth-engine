/**
 * Visibilidade IA — abas Score / Evolução / Histórico numa única rota.
 * Garante que: a aba vem da query string, e o gating de plano trava só a
 * aba Evolução (Score e Histórico seguem livres para Presença).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("./DiagnosticoPage", () => ({
  default: () => <div data-testid="tab-score">conteudo score</div>,
}));
vi.mock("./AuditoriasPage", () => ({
  default: () => <div data-testid="tab-historico">conteudo historico</div>,
}));
vi.mock("./PilaresPage", () => ({
  default: () => <div data-testid="tab-evolucao">conteudo evolucao</div>,
}));
vi.mock("@/components/dashboard/UpgradeModal", () => ({
  UpgradeModal: () => null,
}));

const subStatus = {
  plano: "presenca" as string | null,
  isPaid: true,
  isTrial: false,
  isAdmin: false,
  isLoading: false,
};
vi.mock("@/hooks/useBrandSettings", () => ({
  useBrandSettings: () => ({ data: { brand_name: "Marca Teste" }, isLoading: false }),
}));
vi.mock("@/hooks/useHasDiagnostic", () => ({
  useHasDiagnostic: () => ({ hasDiagnostic: true, isLoading: false }),
}));
vi.mock("@/components/dashboard/ReanalyzeCard", () => ({
  ReanalyzeCard: () => <button type="button">Realizar nova análise</button>,
}));
vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => subStatus,
}));

import VisibilidadeIAPage from "./VisibilidadeIAPage";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <VisibilidadeIAPage />
    </MemoryRouter>,
  );
}

describe("VisibilidadeIAPage", () => {
  it("abre na aba Score por padrão", () => {
    subStatus.plano = "autoridade";
    renderAt("/dashboard/visibilidade-ia");
    expect(screen.getByTestId("tab-score")).toBeInTheDocument();
  });

  it("respeita ?aba=historico", () => {
    subStatus.plano = "autoridade";
    renderAt("/dashboard/visibilidade-ia?aba=historico");
    expect(screen.getByTestId("tab-historico")).toBeInTheDocument();
  });

  it("Influência+ vê a Evolução completa", () => {
    subStatus.plano = "influencia";
    renderAt("/dashboard/visibilidade-ia?aba=evolucao");
    expect(screen.getByTestId("tab-evolucao")).toBeInTheDocument();
    expect(screen.queryByText(/Fazer upgrade/i)).not.toBeInTheDocument();
  });

  it("mostra o botão de nova análise no cabeçalho, independente da aba", () => {
    subStatus.plano = "presenca";
    renderAt("/dashboard/visibilidade-ia?aba=historico");
    expect(screen.getByRole("button", { name: /Realizar nova análise/i })).toBeInTheDocument();
  });

  it("Presença vê a Evolução travada, mas as abas Score e Histórico continuam disponíveis", () => {
    subStatus.plano = "presenca";
    renderAt("/dashboard/visibilidade-ia?aba=evolucao");
    expect(screen.getByText(/Fazer upgrade para Influência/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Score/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Histórico/i })).toBeInTheDocument();
  });
});
