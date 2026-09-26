import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import { getBrandScope, setActiveBrand, subscribeBrandScope } from "@/lib/brand-scope";

export interface AgencyBrandRow {
  id: string;
  brand_name: string;
  website: string;
  sector: string;
  onboarding_completed_at: string | null;
  score: number | null;
  delta: number | null;
  vitrineTerms: number;
}

/** Carteira da agência: marcas vinculadas + score, variação e termos da Vitrine. */
export function useAgencyBrands(enabled = true) {
  const { userId } = useAuthUserId();
  return useQuery({
    queryKey: ["agency-brands", userId],
    enabled: enabled && !!userId,
    staleTime: 30 * 1000,
    // Volta do onboarding com marca nova: sempre revalida a carteira.
    refetchOnMount: "always",
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<AgencyBrandRow[]> => {
      const { data: links, error } = await supabase
        .from("agency_brands")
        .select("brand_id, added_at")
        .eq("agency_user_id", userId!)
        .eq("status", "ativo")
        .order("added_at", { ascending: true });
      if (error) throw error;
      const ids = (links ?? []).map((l) => l.brand_id as string);
      if (ids.length === 0) return [];
      const [brandsRes, auditsRes, vitrineRes] = await Promise.all([
        supabase.from("brand_settings").select("id, brand_name, website, sector, onboarding_completed_at").in("id", ids),
        supabase.from("audit_reports").select("brand_id, overall_score, created_at").in("brand_id", ids).order("created_at", { ascending: false }),
        supabase.from("vitrine_queries").select("brand_id").in("brand_id", ids).eq("ativo", true),
      ]);
      if (brandsRes.error) throw brandsRes.error;
      const scores = new Map<string, number[]>();
      for (const a of (auditsRes.data ?? []) as { brand_id: string; overall_score: number }[]) {
        const arr = scores.get(a.brand_id) ?? [];
        if (arr.length < 2) arr.push(a.overall_score);
        scores.set(a.brand_id, arr);
      }
      const terms = new Map<string, number>();
      for (const v of (vitrineRes.data ?? []) as { brand_id: string }[]) {
        terms.set(v.brand_id, (terms.get(v.brand_id) ?? 0) + 1);
      }
      const byId = new Map((brandsRes.data ?? []).map((b) => [b.id as string, b]));
      return ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((b) => {
          const s = scores.get(b!.id as string) ?? [];
          return {
            ...(b as Omit<AgencyBrandRow, "score" | "delta" | "vitrineTerms">),
            score: s[0] ?? null,
            delta: s.length === 2 ? s[0] - s[1] : null,
            vitrineTerms: terms.get(b!.id as string) ?? 0,
          };
        });
    },
  });
}

/** Marca ativa (id) da agência, reativa a trocas. */
export function useActiveBrandId() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const refresh = () => getBrandScope().then((s) => alive && setId(s?.brandId ?? null));
    refresh();
    const unsub = subscribeBrandScope(refresh);
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  return id;
}

const KEEP_KEYS = new Set(["auth-user-id", "auth-user", "user_roles", "assinaturas", "agency-brands"]);

/** Troca a marca ativa e descarta o cache das telas (cada marca tem seus próprios dados). */
export function useSwitchBrand() {
  const qc = useQueryClient();
  const { userId } = useAuthUserId();
  return (brandId: string) => {
    if (!userId) return;
    setActiveBrand(userId, brandId);
    qc.removeQueries({ predicate: (q) => !KEEP_KEYS.has(String(q.queryKey[0])) });
    qc.invalidateQueries({ queryKey: ["agency-brands"] });
  };
}
