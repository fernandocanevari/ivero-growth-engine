/**
 * Cobertura matricial: cada classe de erro do Supabase (RLS, unique,
 * network, 5xx, FK, timeout, sem mensagem) percorre `mutationErrorToast`
 * para todas as actions usadas no app — sem duplicar boilerplate por hook.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

import { mutationErrorToast } from "./mutation-toast";
import { SUPABASE_ERROR_SCENARIOS } from "@/test/supabase-error-scenarios";

const ACTIONS = [
  "salvar a análise",
  "salvar o relatório",
  "remover o relatório",
  "salvar suas respostas",
] as const;

beforeEach(() => toastMock.mockReset());

describe("mutationErrorToast × matriz Supabase", () => {
  for (const action of ACTIONS) {
    describe(`action: ${action}`, () => {
      it.each(SUPABASE_ERROR_SCENARIOS)(
        "[$id] $label → toast destrutivo com fragmento esperado",
        (scenario) => {
          mutationErrorToast(action)(scenario.error);
          expect(toastMock).toHaveBeenCalledTimes(1);
          const arg = toastMock.mock.calls[0][0];
          expect(arg.variant).toBe("destructive");
          expect(arg.title).toBe(`Não foi possível ${action}`);
          expect(String(arg.description)).toContain(scenario.expectedFragment);
        },
      );
    });
  }
});
