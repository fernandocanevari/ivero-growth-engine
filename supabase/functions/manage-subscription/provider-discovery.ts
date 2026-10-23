// Descoberta e remoção de assinaturas no Asaas para um usuário (testável sem rede).
//
// O Asaas cria um cliente NOVO a cada checkout, então o asaas_customer_id
// gravado na linha pode estar velho. Por isso o conjunto de clientes do usuário
// é: o cliente gravado + TODOS os clientes com o e-mail da conta (paginado).

export type AsaasFetch = (
  path: string,
  init?: RequestInit,
) => Promise<{ ok: boolean; status: number; json: Record<string, any> | null; text: string }>;

export interface AsaasSubscription {
  id: string;
  customer?: string | null;
  status?: string | null;
  externalReference?: string | null;
  dateCreated?: string | null;
  deleted?: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

/** externalReference com id de OUTRO usuário: nunca é deste cliente. */
export function belongsToOtherUser(sub: { externalReference?: string | null }, userId: string): boolean {
  const ref = String(sub.externalReference ?? "").trim();
  return UUID_RE.test(ref) && ref.toLowerCase() !== userId.toLowerCase();
}

/** Assinatura que ainda pode cobrar o cartão. */
export function isLiveSubscription(sub: { status?: string | null; deleted?: boolean } | null | undefined): boolean {
  return !!sub && sub.deleted !== true && String(sub.status ?? "").toUpperCase() === "ACTIVE";
}

/** Lista paginada do Asaas. Falha ou lista truncada → lança (fail-closed). */
export async function listAll(fetchAsaas: AsaasFetch, basePath: string): Promise<any[]> {
  const out: any[] = [];
  const sep = basePath.includes("?") ? "&" : "?";
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetchAsaas(`${basePath}${sep}offset=${out.length}&limit=${PAGE_SIZE}`);
    if (!res.ok || !Array.isArray(res.json?.data)) throw new Error(`asaas_list_failed:${res.status}`);
    const data = res.json!.data as any[];
    out.push(...data);
    if (!res.json!.hasMore || data.length === 0) return out;
  }
  throw new Error("asaas_list_truncated");
}

/** Cliente gravado + todos os clientes com exatamente esse e-mail. Lança em falha. */
export async function customerIdsForUser(
  fetchAsaas: AsaasFetch,
  storedCustomerId: string | null,
  email: string | null,
): Promise<string[]> {
  const ids: string[] = [];
  if (storedCustomerId) ids.push(storedCustomerId);
  const wanted = (email ?? "").trim().toLowerCase();
  if (wanted) {
    const rows = await listAll(fetchAsaas, `/customers?email=${encodeURIComponent(wanted)}`);
    for (const c of rows) {
      const id = c?.id ? String(c.id) : "";
      if (!id || c.deleted === true || ids.includes(id)) continue;
      if (String(c.email ?? "").trim().toLowerCase() !== wanted) continue;
      ids.push(id);
    }
  }
  return ids;
}

export type CancelOutcome =
  | { ok: true; deleted: string[]; customerIds: string[] }
  | { ok: false; reason: string; deleted: string[] };

/**
 * Remove TODA assinatura viva do usuário e só devolve ok depois de reler e
 * confirmar que nenhuma continua ACTIVE. Assinatura com externalReference de
 * outro usuário nunca é removida (nem conta como "restante").
 * DELETE com 404 = já não existe.
 */
export async function cancelProviderSubscriptions(
  fetchAsaas: AsaasFetch,
  args: { userId: string; knownSubscriptionId: string | null; customerIds: string[] },
): Promise<CancelOutcome> {
  const deleted: string[] = [];
  const remove = async (id: string) => {
    const res = await fetchAsaas(`/subscriptions/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error(`delete_failed:${id}:${res.status}`);
    deleted.push(id);
  };
  const ownLive = async (): Promise<string[]> => {
    const live: string[] = [];
    for (const customerId of args.customerIds) {
      const subs = await listAll(fetchAsaas, `/subscriptions?customer=${encodeURIComponent(customerId)}`);
      for (const s of subs) {
        if (s?.id && isLiveSubscription(s) && !belongsToOtherUser(s, args.userId)) live.push(String(s.id));
      }
    }
    return live;
  };
  try {
    if (args.knownSubscriptionId) await remove(args.knownSubscriptionId);
    for (const id of await ownLive()) if (!deleted.includes(id)) await remove(id);

    // Verificação: relista tudo antes de liberar a mudança local.
    const remaining = await ownLive();
    if (remaining.length) return { ok: false, reason: `still_active:${remaining.join(",")}`, deleted };
    if (args.knownSubscriptionId) {
      const res = await fetchAsaas(`/subscriptions/${encodeURIComponent(args.knownSubscriptionId)}`);
      if (res.status !== 404) {
        if (!res.ok) throw new Error(`verify_failed:${args.knownSubscriptionId}:${res.status}`);
        if (isLiveSubscription(res.json as AsaasSubscription)) {
          return { ok: false, reason: `still_active:${args.knownSubscriptionId}`, deleted };
        }
      }
    }
    return { ok: true, deleted, customerIds: args.customerIds };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err), deleted };
  }
}
