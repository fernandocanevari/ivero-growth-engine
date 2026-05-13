import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { mutationErrorToast } from "@/lib/mutation-toast";

/**
 * Audit Reports — snapshots completos navegáveis de cada auditoria.
 *
 * Diferente de `analysis_history` (que guarda só os 6 scores para o gráfico
 * de evolução), esta tabela guarda o relatório inteiro: radar, pilares com
 * critérios e justificativas, nuvem de keywords e motores que responderam.
 * Isso permite reabrir qualquer auditoria antiga em /dashboard/auditorias/:id.
 */

export interface AuditReportPayload {
  site_url: string;
  source: "preview" | "reanalise";
  overall_score: number;
  status_label: string;
  radar_data: Array<{ subject: string; value: number; fullMark: number }>;
  pillar_details: unknown[];
  keyword_cloud: unknown[];
  ai_engines: unknown[];
}

export interface AuditReport extends AuditReportPayload {
  id: string;
  user_id: string;
  created_at: string;
}

export function useAuditReports() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const list = useQuery<AuditReport[]>({
    queryKey: ["audit-reports", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_reports")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AuditReport[];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: AuditReportPayload) => {
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("audit_reports")
        .insert({ user_id: userId, ...payload } as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AuditReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-reports", userId] });
    },
    onError: mutationErrorToast("salvar o relatório"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("audit_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-reports", userId] });
      toast({ title: "Relatório removido" });
    },
    onError: mutationErrorToast("remover o relatório"),
  });

  return {
    reports: list.data ?? [],
    isLoading: list.isLoading,
    create,
    remove,
    userId,
  };
}

export function useAuditReport(id: string | undefined) {
  return useQuery<AuditReport | null>({
    queryKey: ["audit-report", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_reports")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as AuditReport | null;
    },
  });
}
