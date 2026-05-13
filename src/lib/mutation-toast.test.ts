import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Garantia: quando o Supabase retorna erro em uma mutation, o helper
 * `mutationErrorToast` é acionado e dispara um toast destrutivo padronizado.
 *
 * Esses testes não montam React; validam o caminho do callback `onError`
 * que injetamos em todas as mutations (useAnalysisHistory, useOnboarding,
 * useAuditReports.create / .remove).
 */

const toastMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

import { mutationErrorToast } from "./mutation-toast";

describe("mutationErrorToast", () => {
  beforeEach(() => {
    toastMock.mockReset();
  });

  it("dispara toast destrutivo com título padronizado", () => {
    const handler = mutationErrorToast("salvar a análise");
    handler(new Error("network down"));

    expect(toastMock).toHaveBeenCalledTimes(1);
    const arg = toastMock.mock.calls[0][0];
    expect(arg.title).toBe("Não foi possível salvar a análise");
    expect(arg.variant).toBe("destructive");
    expect(arg.description).toContain("network down");
    expect(arg.description).toContain("Tente novamente");
  });

  it("aceita objetos com message", () => {
    const handler = mutationErrorToast("remover o relatório");
    handler({ message: "RLS violation" });
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock.mock.calls[0][0].description).toContain("RLS violation");
  });

  it("ainda mostra orientação quando não há mensagem de erro", () => {
    const handler = mutationErrorToast("salvar suas respostas");
    handler(undefined);
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock.mock.calls[0][0].description).toContain("Tente novamente");
  });

  it("simula falha do Supabase em useAnalysisHistory", () => {
    // Reproduz o caminho: supabase.from(...).insert(...) → { error: PostgrestError }
    const supabaseError = { message: "duplicate key value violates unique constraint" };
    const handler = mutationErrorToast("salvar a análise");
    // O hook faria: if (error) throw error; → react-query → onError(error)
    handler(supabaseError);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Não foi possível salvar a análise",
        variant: "destructive",
      }),
    );
  });

  it("simula falha do Supabase em useAuditReports.remove", () => {
    const supabaseError = new Error("permission denied for table audit_reports");
    const handler = mutationErrorToast("remover o relatório");
    handler(supabaseError);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Não foi possível remover o relatório",
        variant: "destructive",
      }),
    );
    expect(toastMock.mock.calls[0][0].description).toContain("permission denied");
  });

  it("simula falha do Supabase em useOnboarding.saveAnswers", () => {
    const supabaseError = new Error("network unreachable");
    const handler = mutationErrorToast("salvar suas respostas");
    handler(supabaseError);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Não foi possível salvar suas respostas",
        variant: "destructive",
      }),
    );
  });
});
