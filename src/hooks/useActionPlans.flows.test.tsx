/**
 * Fluxo 4 — CRUD do Plano de Ação + adoção do catálogo de Autoridade Externa.
 *
 * Somente testes. Nível de hook (contrato com o banco) — o nível de UI
 * (dialog montado, dedupe visual) está em AcoesPage.flows.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const getUserMock = vi.fn();
import { createFromMock, type TableHandler } from "@/test/supabase-query-mock";

let actionRows: unknown[] = [];
const handlers: Record<string, TableHandler> = {
  action_plans: (call) => {
    const write = call.ops.find((op) =>
      ["insert", "update", "delete"].includes(op.method),
    );
    if (write) return { data: { id: "new-1" }, error: null };
    return { data: actionRows, error: null };
  },
  autoridade_externa_catalog: () => ({ data: [], error: null }),
};
const fromMock = createFromMock(handlers);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => getUserMock() },
    from: (table: string) => fromMock(table),
  },
}));

import {
  useActionPlans,
  useCreateActionPlan,
  useDeleteActionPlan,
  useSetActionStatus,
  useUpdateActionPlan,
} from "@/hooks/useActionPlans";
import { useAdoptCatalogAction, useAuthorityCatalog } from "@/hooks/useAuthorityCatalog";
import { sortActionPlans } from "@/lib/action-plans";

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.reset();
  actionRows = [];
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

const row = (over: Record<string, unknown> = {}) => ({
  id: "a1",
  titulo: "Ação",
  categoria: "clareza",
  prioridade: "media",
  status: "pendente",
  origem: "manual",
  created_at: "2026-01-01T00:00:00Z",
  catalog_id: null,
  ...over,
});

describe("Fluxo 4 — leitura e ordenação", () => {
  it("ordena por prioridade (alta → média → baixa) e mais recentes primeiro", () => {
    const rows = [
      row({ id: "b", prioridade: "baixa", created_at: "2026-01-03T00:00:00Z" }),
      row({ id: "m", prioridade: "media", created_at: "2026-01-01T00:00:00Z" }),
      row({ id: "a1", prioridade: "alta", created_at: "2026-01-01T00:00:00Z" }),
      row({ id: "a2", prioridade: "alta", created_at: "2026-01-05T00:00:00Z" }),
    ] as never[];
    expect(sortActionPlans(rows).map((r: { id: string }) => r.id)).toEqual([
      "a2",
      "a1",
      "m",
      "b",
    ]);
  });

  it("aplica o filtro de categoria na query (eq categoria)", async () => {
    actionRows = [row()];
    const { result } = renderHook(
      () => useActionPlans({ categoria: "autoridade_externa" }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const eqs = fromMock.opsFor("action_plans", "eq").map((op) => op.args);
    expect(eqs).toContainEqual(["categoria", "autoridade_externa"]);
  });

  it("sem filtro não adiciona nenhum eq", async () => {
    const { result } = renderHook(() => useActionPlans(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock.opsFor("action_plans", "eq")).toHaveLength(0);
  });
});

describe("Fluxo 4 — create / update / delete manual", () => {
  it("cria ação manual com origem='manual' e campos vazios normalizados para null", async () => {
    const { result } = renderHook(() => useCreateActionPlan(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        titulo: "  Publicar case  ",
        categoria: "autoridade",
        descricao: "   ",
        impacto_estimado: "",
      });
    });
    const [op] = fromMock.opsFor("action_plans", "insert");
    expect(op.args[0]).toMatchObject({
      user_id: "user-1",
      titulo: "Publicar case",
      categoria: "autoridade",
      prioridade: "media",
      descricao: null,
      impacto_estimado: null,
      origem: "manual",
    });
  });

  it("falha sem usuário autenticado e não escreve no banco", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useCreateActionPlan(), { wrapper: wrapper() });
    await expect(
      result.current.mutateAsync({ titulo: "x", categoria: "clareza" }),
    ).rejects.toThrow(/não autenticado/i);
    expect(fromMock.opsFor("action_plans", "insert")).toHaveLength(0);
  });

  it("update envia apenas os campos informados", async () => {
    const { result } = renderHook(() => useUpdateActionPlan(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: "a1", titulo: " Novo " });
    });
    const [op] = fromMock.opsFor("action_plans", "update");
    expect(op.args[0]).toEqual({ titulo: "Novo" });
    expect(fromMock.opsFor("action_plans", "eq")).toContainEqual({
      method: "eq",
      args: ["id", "a1"],
    });
  });

  it.each(["pendente", "em_andamento", "concluido"] as const)(
    "setStatus persiste o status %s",
    async (status) => {
      const { result } = renderHook(() => useSetActionStatus(), { wrapper: wrapper() });
      await act(async () => {
        await result.current.mutateAsync({ id: "a1", status });
      });
      const [op] = fromMock.opsFor("action_plans", "update");
      expect(op.args[0]).toEqual({ status });
    },
  );

  it("delete remove por id", async () => {
    const { result } = renderHook(() => useDeleteActionPlan(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync("a1");
    });
    expect(fromMock.opsFor("action_plans", "delete")).toHaveLength(1);
    expect(fromMock.opsFor("action_plans", "eq")).toContainEqual({
      method: "eq",
      args: ["id", "a1"],
    });
  });
});

describe("Fluxo 4 — adoção do catálogo de Autoridade Externa", () => {
  const item = {
    id: "cat-1",
    subcategoria: "publicacoes_midia",
    titulo: "Publicar artigo em veículo do setor",
    descricao: "desc",
    objetivo: "obj",
    impacto_estimado: "Alto",
    tempo_estimado: "2 semanas",
    dificuldade: "media",
    prioridade: "alta",
    icon: "Newspaper",
    ordem: 1,
    ativo: true,
  } as never;

  it("copia os campos do catálogo e amarra catalog_id + categoria autoridade_externa", async () => {
    const { result } = renderHook(() => useAdoptCatalogAction(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync(item);
    });
    const [op] = fromMock.opsFor("action_plans", "insert");
    expect(op.args[0]).toMatchObject({
      user_id: "user-1",
      titulo: "Publicar artigo em veículo do setor",
      objetivo: "obj",
      tempo_estimado: "2 semanas",
      dificuldade: "media",
      prioridade: "alta",
      categoria: "autoridade_externa",
      subcategoria: "publicacoes_midia",
      catalog_id: "cat-1",
      origem: "manual",
    });
  });

  it("catálogo lê somente itens ativos, ordenados por 'ordem'", async () => {
    const { result } = renderHook(() => useAuthorityCatalog(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock.opsFor("autoridade_externa_catalog", "eq")).toContainEqual({
      method: "eq",
      args: ["ativo", true],
    });
    expect(fromMock.opsFor("autoridade_externa_catalog", "order")[0].args[0]).toBe("ordem");
  });

  it("dedupe: catalog_id das ações adotadas identifica o item já adicionado", async () => {
    actionRows = [row({ id: "x", categoria: "autoridade_externa", catalog_id: "cat-1" })];
    const { result } = renderHook(
      () => useActionPlans({ categoria: "autoridade_externa" }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const adoptedIds = new Set(
      (result.current.data ?? []).map((a) => a.catalog_id).filter(Boolean),
    );
    expect(adoptedIds.has("cat-1")).toBe(true);
    expect(adoptedIds.has("cat-2")).toBe(false);
  });
});
