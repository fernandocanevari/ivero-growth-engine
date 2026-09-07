/**
 * Configuração de ambiente do Asaas.
 *
 * ASAAS_ENV = "producao" | "sandbox" (default: "sandbox").
 * A chave é escolhida pelo ambiente:
 *  - producao → ASAAS_API_KEY
 *  - sandbox  → ASAAS_API_KEY_SANDBOX
 *
 * Assim voltar ao sandbox é trocar um único valor de configuração, sem código.
 */

export type AsaasEnv = "producao" | "sandbox";

export function asaasEnv(): AsaasEnv {
  const raw = (Deno.env.get("ASAAS_ENV") ?? "sandbox").trim().toLowerCase();
  return raw === "producao" || raw === "production" || raw === "prod" ? "producao" : "sandbox";
}

export function asaasBaseUrl(): string {
  return asaasEnv() === "producao"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";
}

/** Nome da variável esperada no ambiente atual (usado em mensagens de erro). */
export function asaasKeyName(): string {
  return asaasEnv() === "producao" ? "ASAAS_API_KEY" : "ASAAS_API_KEY_SANDBOX";
}

export function asaasApiKey(): string | undefined {
  const env = asaasEnv();
  if (env === "producao") {
    return Deno.env.get("ASAAS_API_KEY") ?? undefined;
  }
  return Deno.env.get("ASAAS_API_KEY_SANDBOX") ?? undefined;
}
