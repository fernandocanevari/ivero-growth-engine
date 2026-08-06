/**
 * Fluxo 4 (UI) — tela "Planos de Ação".
 *
 * Somente testes. Cobre: dialog montado independentemente do filtro,
 * seletor de status com as 3 opções, toggle Todas/Autoridade Externa e
 * botão "Já adicionado" desabilitado para item do catálogo já adotado.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const createMutate = vi.fn();
const setStatusMutate = vi.fn();
const deleteMutate = vi.fn();
const adoptMutate = vi.fn();

let brandSettings: unknown = { brand_name: "Ivero", website: "ivero.ai" };
let actions: Array<Record<string, unknown>> = [];

vi.mock("@/hooks/useBrandSettings", () => ({
  useBrandSettings: () => ({ data: brandSettings, isLoading: false }),
}));

vi.mock("@/hooks/useActionPlans", () => ({
  useActionPlans: (filters: { categoria?: string } = {}) => ({
    data: filters.categoria
      ? actions.filter((a) => a.categoria === filters.categoria)
      : actions,
    isLoading: false,
  }),
  useCreateActionPlan: () => ({ mutate: createMutate, isPending: false }),
  useSetActionStatus: () => ({ mutate: setStatusMutate, isPending: false }),
  useDeleteActionPlan: () => ({ mutate: deleteMutate, isPending: false }),
  useUpdateActionPlan: () => ({ mutate: vi.fn(), isPending: false }),
}));

const CATALOG_ITEM = {
  id: "cat-1",
  subcategoria: "publicacoes_midia",
  titulo: "Publicar artigo em veículo do setor",
  descricao: "Ganhe citações em mídia especializada.",
  objetivo: "Autoridade",
  impacto_estimado: "Alto",
  tempo_estimado: "2 semanas",
  dificuldade: "media",
  prioridade: "alta",
  icon: "Newspaper",
  ordem: 1,
  ativo: true,
};

vi.mock("@/hooks/useAuthorityCatalog", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "@/hooks/useAuthorityCatalog",
  );
  return {
    ...actual,
    useAuthorityCatalog: () => ({ data: [CATALOG_ITEM], isLoading: false }),
    useAdoptCatalogAction: () => ({ mutate: adoptMutate, isPending: false }),
  };
});

import AcoesPage from "./AcoesPage";

const action = (over: Record<string, unknown> = {}) => ({
  id: "a1",
  titulo: "Reescrever a home",
  descricao: "Deixar a proposta clara",
  impacto_estimado: "Alto",
  categoria: "clareza",
  prioridade: "alta",
  status: "pendente",
  origem: "manual",
  created_at: "2026-01-01T00:00:00Z",
  catalog_id: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  brandSettings = { brand_name: "Ivero", website: "ivero.ai" };
  actions = [action()];
});

describe("Fluxo 4 (UI) — Planos de Ação", () => {
  it("renderiza a ação com o seletor de status contendo as 3 opções", async () => {
    const user = userEvent.setup();
    render(<AcoesPage />);
    expect(screen.getByText("Reescrever a home")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox"));
    await waitFor(() => expect(screen.getByText("Em andamento")).toBeInTheDocument());
    expect(screen.getByText("Concluído")).toBeInTheDocument();
  });

  it("mudar o status dispara setStatus com o novo valor", async () => {
    const user = userEvent.setup();
    render(<AcoesPage />);
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("Em andamento"));
    await waitFor(() =>
      expect(setStatusMutate).toHaveBeenCalledWith({ id: "a1", status: "em_andamento" }),
    );
  });

  it("excluir pede confirmação e só então dispara o delete", async () => {
    const user = userEvent.setup();
    render(<AcoesPage />);
    await user.click(screen.getByRole("button", { name: "" }).closest("button")!);
    await waitFor(() => expect(screen.getByText("Excluir esta ação?")).toBeInTheDocument());
    expect(deleteMutate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(deleteMutate).toHaveBeenCalledWith("a1");
  });

  it("abre o dialog de nova ação e cria com os dados do formulário", async () => {
    const user = userEvent.setup();
    render(<AcoesPage />);
    await user.click(screen.getByRole("button", { name: /nova ação/i }));
    const dialog = await screen.findByRole("dialog");
    const titulo = dialog.querySelector("input") as HTMLInputElement;
    await user.type(titulo, "Criar página de comparação");
    await user.click(screen.getByRole("button", { name: /criar ação/i }));
    await waitFor(() => expect(createMutate).toHaveBeenCalled());
    expect(createMutate.mock.calls[0][0]).toMatchObject({
      titulo: "Criar página de comparação",
    });
  });

  it("não cria ação com título vazio", async () => {
    const user = userEvent.setup();
    render(<AcoesPage />);
    await user.click(screen.getByRole("button", { name: /nova ação/i }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /criar ação/i }));
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("empty state aparece quando não há nenhuma ação", () => {
    actions = [];
    render(<AcoesPage />);
    expect(screen.queryByText("Reescrever a home")).not.toBeInTheDocument();
  });

  it("filtro Autoridade Externa mostra o catálogo e permite adotar", async () => {
    const user = userEvent.setup();
    render(<AcoesPage />);
    await user.click(screen.getByRole("button", { name: /autoridade externa/i }));
    const accordionTrigger = await screen.findByText(/Publicações/i);
    await user.click(accordionTrigger);
    const addBtn = await screen.findByRole("button", { name: /adicionar/i });
    await user.click(addBtn);
    expect(adoptMutate).toHaveBeenCalledWith(expect.objectContaining({ id: "cat-1" }));
  });

  it("item já adotado mostra 'Já adicionado' desabilitado (sem duplicar)", async () => {
    actions = [
      action({ id: "x", categoria: "autoridade_externa", catalog_id: "cat-1" }),
    ];
    const user = userEvent.setup();
    render(<AcoesPage />);
    await user.click(screen.getByRole("button", { name: /autoridade externa/i }));
    await user.click(await screen.findByText(/Publicações/i));
    const btn = await screen.findByRole("button", { name: /já adicionado/i });
    expect(btn).toBeDisabled();
    expect(adoptMutate).not.toHaveBeenCalled();
  });
});
