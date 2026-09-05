/**
 * Fluxo 1 — Signup → criação do trial
 * Fluxo 2 — Redirecionamento pós-login
 *
 * Somente testes: nenhuma lógica de produto é alterada aqui.
 * O que é coberto no signup é o contrato do frontend com o trigger
 * `handle_new_user_trial`: o plano escolhido tem que viajar em
 * `options.data.plano_escolhido` e NENHUMA chamada de checkout pode
 * acontecer no cadastro (o trial é gratuito por 7 dias).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const navigateMock = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [searchParams, vi.fn()],
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), identifyUser: vi.fn() }));

const signUpMock = vi.fn();
const signInMock = vi.fn();
const getSessionMock = vi.fn();
const signOutMock = vi.fn();
const invokeMock = vi.fn();
let authCallback: ((event: string, session: unknown) => void) | null = null;

import { createFromMock, type TableHandler } from "@/test/supabase-query-mock";

let handlers: Record<string, TableHandler> = {};
const fromMock = createFromMock(
  new Proxy(
    {},
    {
      get: (_t, table: string) => handlers[table],
      has: (_t, table: string) => table in handlers,
      ownKeys: () => Reflect.ownKeys(handlers),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    },
  ) as Record<string, TableHandler>,
);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: (...a: unknown[]) => signUpMock(...a),
      signInWithPassword: (...a: unknown[]) => signInMock(...a),
      getSession: () => getSessionMock(),
      signOut: () => signOutMock(),
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      resetPasswordForEmail: vi.fn(),
    },
    from: (table: string) => fromMock(table),
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));

import AuthPage from "./AuthPage";

const SESSION = { user: { id: "user-1", email: "novo@teste.com" } };

beforeEach(() => {
  vi.clearAllMocks();
  authCallback = null;
  handlers = {};
  fromMock.reset();
  searchParams = new URLSearchParams();
  localStorage.clear();
  getSessionMock.mockResolvedValue({ data: { session: null } });
  signOutMock.mockResolvedValue({ error: null });
  signUpMock.mockResolvedValue({ data: { user: { id: "user-1" }, session: null }, error: null });
  signInMock.mockResolvedValue({ error: null });
});

async function fillSignup() {
  const user = userEvent.setup();
  render(<AuthPage />);
  await user.type(screen.getByPlaceholderText("Seu nome completo"), "Maria Teste");
  await user.type(screen.getByPlaceholderText("(11) 91234-5678"), "11912345678");
  await user.type(screen.getByPlaceholderText("seu@email.com"), "novo@teste.com");
  await user.type(screen.getByPlaceholderText("••••••••"), "senha123");
  await user.click(screen.getByRole("button", { name: /criar conta/i }));
  return user;
}

describe("Fluxo 1 — signup cria o trial via metadata", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams("mode=signup");
  });

  it.each([
    ["Presença", "presenca"],
    ["Influência", "influencia"],
    ["Autoridade", "autoridade"],
    ["influencia", "influencia"],
  ])("plano escolhido %s viaja como %s em plano_escolhido", async (stored, expected) => {
    localStorage.setItem("ivero_selected_plan", stored);
    await fillSignup();

    await waitFor(() => expect(signUpMock).toHaveBeenCalledTimes(1));
    const args = signUpMock.mock.calls[0][0] as {
      options: { data: Record<string, string> };
    };
    expect(args.options.data.plano_escolhido).toBe(expected);
  });

  it("cai em 'presenca' quando nenhum plano foi escolhido na landing", async () => {
    await fillSignup();
    await waitFor(() => expect(signUpMock).toHaveBeenCalled());
    const args = signUpMock.mock.calls[0][0] as { options: { data: Record<string, string> } };
    expect(args.options.data.plano_escolhido).toBe("presenca");
  });

  it("ignora valor inválido no localStorage e usa 'presenca'", async () => {
    localStorage.setItem("ivero_selected_plan", "plano_pirata");
    await fillSignup();
    await waitFor(() => expect(signUpMock).toHaveBeenCalled());
    const args = signUpMock.mock.calls[0][0] as { options: { data: Record<string, string> } };
    expect(args.options.data.plano_escolhido).toBe("presenca");
  });

  it("não dispara nenhuma chamada de checkout/pagamento no cadastro", async () => {
    localStorage.setItem("ivero_selected_plan", "autoridade");
    await fillSignup();
    await waitFor(() => expect(signUpMock).toHaveBeenCalled());
    expect(invokeMock).not.toHaveBeenCalled();
    // nenhum write direto em assinaturas: o trial é criado pelo trigger no banco
    expect(fromMock.calls.some((c) => c.table === "assinaturas")).toBe(false);
  });

  it("limpa o plano escolhido do localStorage após o cadastro", async () => {
    localStorage.setItem("ivero_selected_plan", "influencia");
    await fillSignup();
    await waitFor(() => expect(localStorage.getItem("ivero_selected_plan")).toBeNull());
  });

  it("rejeita celular inválido antes de chamar signUp", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await user.type(screen.getByPlaceholderText("Seu nome completo"), "Maria");
    await user.type(screen.getByPlaceholderText("(11) 91234-5678"), "119");
    await user.type(screen.getByPlaceholderText("seu@email.com"), "novo@teste.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "senha123");
    await user.click(screen.getByRole("button", { name: /criar conta/i }));
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("após SIGNED_IN de signup vai para /onboarding/perguntas (nunca /bem-vindo)", async () => {
    await fillSignup();
    await waitFor(() => expect(signUpMock).toHaveBeenCalled());
    authCallback?.("SIGNED_IN", SESSION);
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/onboarding/perguntas", { replace: true }),
    );
    expect(navigateMock).not.toHaveBeenCalledWith("/bem-vindo", expect.anything());
  });
});

describe("Fluxo 2 — redirecionamento pós-login", () => {
  const setup = async () => {
    render(<AuthPage />);
    // Aguarda o check de sessão obsoleta (staleSessionCheckDone) terminar
    await waitFor(() => expect(getSessionMock).toHaveBeenCalled());
    await Promise.resolve();
  };

  const emitLogin = () => authCallback?.("SIGNED_IN", SESSION);

  const brandRow = (row: unknown): TableHandler => () => ({ data: row, error: null });

  it("admin vai direto para /dashboard/admin", async () => {
    handlers = { user_roles: brandRow({ role: "admin" }) };
    await setup();
    emitLogin();
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/dashboard/admin", { replace: true }),
    );
  });

  it("onboarding concluído (onboarding_completed_at) vai para /dashboard", async () => {
    handlers = {
      user_roles: brandRow(null),
      brand_settings: brandRow({
        id: "b1",
        brand_name: null,
        onboarding_completed_at: "2026-01-01T00:00:00Z",
      }),
    };
    await setup();
    emitLogin();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true }));
  });

  it("fallback: brand_name preenchido também conta como concluído", async () => {
    handlers = {
      user_roles: brandRow(null),
      brand_settings: brandRow({ id: "b1", brand_name: "Ivero", onboarding_completed_at: null }),
    };
    await setup();
    emitLogin();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true }));
  });

  it("3 perguntas respondidas → /onboarding/site", async () => {
    handlers = {
      user_roles: brandRow(null),
      brand_settings: brandRow({ id: "b1", brand_name: null, onboarding_completed_at: null }),
      onboarding_responses: brandRow({
        p1_maturidade_ia: "nao_sei_dizer",
        p2_criterio_mercado: "preco_custo",
        p3_maior_risco: "nao_mencionado",
      }),
    };
    await setup();
    emitLogin();
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/onboarding/site", { replace: true }),
    );
  });

  it.each([
    ["resposta parcial (só p1)", { p1_maturidade_ia: "x", p2_criterio_mercado: "", p3_maior_risco: "" }],
    ["resposta parcial (p1+p2)", { p1_maturidade_ia: "x", p2_criterio_mercado: "y", p3_maior_risco: "" }],
    ["nenhuma resposta salva", null],
  ])("%s → /onboarding/perguntas", async (_name, resp) => {
    handlers = {
      user_roles: brandRow(null),
      brand_settings: brandRow({ id: "b1", brand_name: null, onboarding_completed_at: null }),
      onboarding_responses: brandRow(resp),
    };
    await setup();
    emitLogin();
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/onboarding/perguntas", { replace: true }),
    );
  });

  it("sem brand_settings → /onboarding/perguntas", async () => {
    handlers = { user_roles: brandRow(null), brand_settings: brandRow(null) };
    await setup();
    emitLogin();
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/onboarding/perguntas", { replace: true }),
    );
  });

  it("?redirect=/dashboard/acoes é honrado sem consultar o estado de onboarding", async () => {
    searchParams = new URLSearchParams("redirect=/dashboard/acoes");
    handlers = { user_roles: brandRow(null) };
    await setup();
    emitLogin();
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/dashboard/acoes", { replace: true }),
    );
    expect(fromMock.calls.some((c) => c.table === "brand_settings")).toBe(false);
  });

  it("?redirect apontando para rota de onboarding é ignorado (estado do banco manda)", async () => {
    searchParams = new URLSearchParams("redirect=/onboarding/site");
    handlers = {
      user_roles: brandRow(null),
      brand_settings: brandRow({ id: "b1", brand_name: "Ivero", onboarding_completed_at: null }),
    };
    await setup();
    emitLogin();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true }));
  });

  it("não redireciona enquanto o check de sessão obsoleta não terminou", async () => {
    let release: (v: unknown) => void = () => {};
    getSessionMock.mockReturnValue(new Promise((r) => { release = r; }));
    handlers = {
      user_roles: () => ({ data: null, error: null }),
      brand_settings: () => ({ data: { id: "b1", brand_name: "Ivero" }, error: null }),
    };
    render(<AuthPage />);
    emitLogin();
    await Promise.resolve();
    expect(navigateMock).not.toHaveBeenCalled();
    release({ data: { session: null } });
  });
});

describe("Fluxo proposta — plano/ciclo herdados da URL", () => {
  it("plano da URL tem precedência sobre o localStorage", async () => {
    localStorage.setItem("ivero_selected_plan", "Presença");
    setSearch("?mode=signup&plano=influencia&ciclo=anual&slug=abc-123&name=Ana&email=ana@x.com&phone=11912345678");
    await doSignup();
    const meta = signUpMock.mock.calls[0][0].options.data;
    expect(meta.plano_escolhido).toBe("influencia");
    expect(meta.ciclo_escolhido).toBe("anual");
    expect(meta.proposta_slug).toBe("abc-123");
  });
});
