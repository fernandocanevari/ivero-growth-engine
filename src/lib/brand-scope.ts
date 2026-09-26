import { supabase } from "@/integrations/supabase/client";

/**
 * Contexto de marca ativa.
 * - Conta individual: brandId = null → todas as leituras seguem por user_id (comportamento original).
 * - Conta de agência: brandId = marca selecionada no BrandSwitcher (salva por usuário no navegador).
 */
export interface BrandScope {
  userId: string;
  isAgency: boolean;
  brandId: string | null;
  brandIds: string[];
}

const NONE = "00000000-0000-0000-0000-000000000000";
const storageKey = (uid: string) => `ivero:activeBrand:${uid}`;

let cache: { userId: string; isAgency: boolean; brandIds: string[] } | null = null;
let inflight: Promise<BrandScope | null> | null = null;
const listeners = new Set<() => void>();

export function subscribeBrandScope(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function readActive(uid: string) {
  try {
    return localStorage.getItem(storageKey(uid));
  } catch {
    return null;
  }
}

export function invalidateBrandScope() {
  cache = null;
  inflight = null;
}

async function load(): Promise<BrandScope | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (!cache || cache.userId !== user.id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("user_id", user.id)
      .maybeSingle();
    const isAgency = (prof as { account_type?: string } | null)?.account_type === "agency";
    let brandIds: string[] = [];
    if (isAgency) {
      const { data: links } = await supabase
        .from("agency_brands")
        .select("brand_id, added_at")
        .eq("agency_user_id", user.id)
        .eq("status", "ativo")
        .order("added_at", { ascending: true });
      brandIds = (links ?? []).map((l) => l.brand_id as string);
    }
    cache = { userId: user.id, isAgency, brandIds };
  }
  const stored = readActive(cache.userId);
  const brandId = cache.isAgency
    ? stored && cache.brandIds.includes(stored)
      ? stored
      : cache.brandIds[0] ?? null
    : null;
  return { ...cache, brandId };
}

export async function getBrandScope(): Promise<BrandScope | null> {
  if (!inflight) inflight = load().finally(() => setTimeout(() => (inflight = null), 0));
  return inflight;
}

/** Troca a marca ativa da agência. Limpa o snapshot de diagnóstico da aba (é da marca anterior). */
export function setActiveBrand(userId: string, brandId: string) {
  try {
    localStorage.setItem(storageKey(userId), brandId);
    sessionStorage.removeItem("ivero:lastDiagnostic");
    sessionStorage.removeItem("ivero:audit_adopted");
  } catch {
    /* ignora */
  }
  if (cache && cache.userId === userId && !cache.brandIds.includes(brandId)) {
    cache = { ...cache, brandIds: [...cache.brandIds, brandId] };
  }
  listeners.forEach((l) => l());
}

/** Filtro de leitura: só restringe por brand_id em contas de agência. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyBrandFilter<Q extends { eq: (c: string, v: string) => any }>(q: Q, scope: BrandScope | null): Q {
  if (scope?.isAgency) return q.eq("brand_id", scope.brandId ?? NONE) as Q;
  return q;
}

/** Campo extra de gravação: brand_id só para agências. */
export function brandWriteFields(scope: BrandScope | null): { brand_id?: string } {
  return scope?.isAgency && scope.brandId ? { brand_id: scope.brandId } : {};
}
