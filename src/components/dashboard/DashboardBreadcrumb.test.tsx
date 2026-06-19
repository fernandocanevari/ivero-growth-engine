import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardBreadcrumb } from "./DashboardBreadcrumb";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DashboardBreadcrumb />
    </MemoryRouter>,
  );
}

describe("DashboardBreadcrumb — match de rotas aninhadas", () => {
  it("mostra apenas o link raiz quando a rota é exatamente /dashboard", () => {
    renderAt("/dashboard");
    expect(screen.getByRole("link", { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Visão Geral/i)).toBeInTheDocument();
    expect(screen.queryByTestId("breadcrumb-current")).not.toBeInTheDocument();
  });

  it("mostra o item exato quando rota bate com um item do menu", () => {
    renderAt("/dashboard/score");
    expect(screen.getByText(/Inteligência/i)).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumb-current")).toHaveTextContent(/Score GEO/i);
  });

  it("usa o item mais específico em rota aninhada com id (relatório)", () => {
    renderAt("/dashboard/auditorias/abc-123");
    expect(screen.getByText(/Visão Geral/i)).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumb-current")).toHaveTextContent(/Análise de Resultados/i);
  });

  it("prefere /dashboard/admin/clientes sobre /dashboard/admin em rota aninhada com :id", () => {
    renderAt("/dashboard/admin/clientes/42");
    expect(screen.getByText(/Administração/i)).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumb-current")).toHaveTextContent(/Clientes/i);
    expect(screen.getByTestId("breadcrumb-current")).not.toHaveTextContent(/Painel Admin/i);
  });

  it("identifica corretamente /dashboard/admin (rota exata) entre múltiplas sub-rotas admin", () => {
    renderAt("/dashboard/admin");
    expect(screen.getByText(/Administração/i)).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumb-current")).toHaveTextContent(/Painel Admin/i);
  });

  it("ignora query string e hash ao casar a rota", () => {
    renderAt("/dashboard/diagnostico?foo=bar#secao");
    expect(screen.getByTestId("breadcrumb-current")).toHaveTextContent(/Diagnóstico IA/i);
  });

  it("normaliza trailing slash em sub-rotas", () => {
    renderAt("/dashboard/sentimento/");
    expect(screen.getByTestId("breadcrumb-current")).toHaveTextContent(/Análise de Sentimento/i);
  });

  it("não renderiza o breadcrumb quando a sub-rota é desconhecida (não confunde com Dashboard raiz)", () => {
    const { container } = renderAt("/dashboard/rota-inexistente-xyz");
    expect(container.querySelector('[data-testid="dashboard-breadcrumb"]')).toBeNull();
  });

  it("não renderiza fora do /dashboard", () => {
    const { container } = renderAt("/login");
    expect(container.querySelector('[data-testid="dashboard-breadcrumb"]')).toBeNull();
  });

  it("casa rota profunda com :id em proposta admin", () => {
    renderAt("/dashboard/admin/propostas/uuid-abc-123");
    expect(screen.getByTestId("breadcrumb-current")).toHaveTextContent(/Propostas/i);
  });
});
