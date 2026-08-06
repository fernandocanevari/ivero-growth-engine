/**
 * Chainable Supabase query-builder mock usada pelos testes de fluxo.
 *
 * Uso:
 *   const from = createFromMock({
 *     brand_settings: () => ({ data: { id: "b1" }, error: null }),
 *   });
 *   vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
 *
 * Cada chamada registra a operação em `from.calls` para asserts de
 * argumentos (ex.: onConflict de um upsert).
 */

export interface RecordedOp {
  method: string;
  args: unknown[];
}

export interface RecordedCall {
  table: string;
  ops: RecordedOp[];
}

export type TableHandler = (call: RecordedCall) => { data: unknown; error: unknown };

export interface FromMock {
  (table: string): unknown;
  calls: RecordedCall[];
  /** Todas as operações de um tipo em uma tabela (ex.: upsert em onboarding_responses). */
  opsFor(table: string, method: string): RecordedOp[];
  reset(): void;
}

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "eq",
  "neq",
  "in",
  "is",
  "order",
  "limit",
  "range",
  "gte",
  "lte",
  "filter",
  "match",
] as const;

export function createFromMock(handlers: Record<string, TableHandler>): FromMock {
  const calls: RecordedCall[] = [];

  const fromMock = ((table: string) => {
    const call: RecordedCall = { table, ops: [] };
    calls.push(call);

    const resolve = () => {
      const handler = handlers[table];
      const result = handler ? handler(call) : { data: null, error: null };
      return Promise.resolve(result);
    };

    const chain: Record<string, unknown> = {
      then: (...args: unknown[]) =>
        (resolve() as Promise<unknown>).then(
          ...(args as [never, never]),
        ),
      catch: (...args: unknown[]) =>
        (resolve() as Promise<unknown>).catch(...(args as [never])),
      maybeSingle: () => resolve(),
      single: () => resolve(),
    };

    for (const method of CHAIN_METHODS) {
      chain[method] = (...args: unknown[]) => {
        call.ops.push({ method, args });
        return chain;
      };
    }

    return chain;
  }) as FromMock;

  fromMock.calls = calls;
  fromMock.opsFor = (table: string, method: string) =>
    calls
      .filter((c) => c.table === table)
      .flatMap((c) => c.ops.filter((op) => op.method === method));
  fromMock.reset = () => {
    calls.length = 0;
  };

  return fromMock;
}
