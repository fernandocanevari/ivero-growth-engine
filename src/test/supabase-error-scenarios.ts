/**
 * Matriz de cenários de erro do Supabase reutilizável em testes de toast.
 *
 * Cada cenário descreve:
 *  - id/label: identificação na saída do test runner
 *  - error: o objeto retornado por supabase-js no campo `{ error }`
 *  - expectedFragment: trecho que DEVE aparecer no `description` do toast
 *
 * Use junto com `it.each(SUPABASE_ERROR_SCENARIOS)` para evitar
 * duplicar setup por hook e cobrir todas as classes de falha.
 */

export interface SupabaseErrorScenario {
  id: "rls" | "unique" | "network" | "server_5xx" | "fk_violation" | "timeout" | "unknown";
  label: string;
  error: { message: string; code?: string; details?: string } | Error;
  expectedFragment: string;
}

export const SUPABASE_ERROR_SCENARIOS: SupabaseErrorScenario[] = [
  {
    id: "rls",
    label: "RLS: permission denied",
    error: { message: "permission denied for table audit_reports", code: "42501" },
    expectedFragment: "permission denied",
  },
  {
    id: "unique",
    label: "Unique constraint violation",
    error: {
      message: "duplicate key value violates unique constraint \"analysis_history_pkey\"",
      code: "23505",
    },
    expectedFragment: "duplicate key",
  },
  {
    id: "fk_violation",
    label: "Foreign key violation",
    error: {
      message: "insert or update on table violates foreign key constraint",
      code: "23503",
    },
    expectedFragment: "foreign key",
  },
  {
    id: "network",
    label: "Network unreachable",
    error: new TypeError("Failed to fetch"),
    expectedFragment: "Failed to fetch",
  },
  {
    id: "timeout",
    label: "Statement timeout",
    error: { message: "canceling statement due to statement timeout", code: "57014" },
    expectedFragment: "statement timeout",
  },
  {
    id: "server_5xx",
    label: "Edge / PostgREST 5xx",
    error: { message: "Internal Server Error", code: "PGRST500" },
    expectedFragment: "Internal Server Error",
  },
  {
    id: "unknown",
    label: "Erro sem mensagem",
    error: { message: "" },
    expectedFragment: "Tente novamente",
  },
];

/**
 * Helper: monta uma chain mínima do supabase-js que sempre devolve `error`
 * no terminator escolhido. Útil para mockar `supabase.from(...)`.
 *
 *   fromMock.mockReturnValue(makeFailingChain("insert", scenario.error));
 */
export function makeFailingChain(
  terminator: "insert" | "update" | "delete" | "select",
  error: SupabaseErrorScenario["error"],
) {
  const failing = Promise.resolve({ data: null, error });
  const chain: any = {
    select: () => chain,
    eq: () => (terminator === "delete" || terminator === "update" ? failing : chain),
    order: () => Promise.resolve({ data: [], error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    single: () => failing,
    insert: () => (terminator === "insert" ? failing : chain),
    update: () => (terminator === "update" ? chain : chain),
    delete: () => chain,
  };
  return chain;
}
