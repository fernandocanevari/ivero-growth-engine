import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { ShieldAlert, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface OnboardingRow {
  id: string;
  user_id: string;
  question_1: string;
  question_2: string;
  question_3: string;
  completed: boolean;
  created_at: string;
  profile?: { display_name: string | null };
}

export default function AdminRespostasPage() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  const { data: responses, isLoading } = useQuery({
    queryKey: ["admin_onboarding_responses"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: onboarding, error } = await supabase
        .from("client_onboarding")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!onboarding || onboarding.length === 0) return [];

      const userIds = [...new Set(onboarding.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));

      return onboarding.map((row) => ({
        ...row,
        profile: { display_name: profileMap.get(row.user_id) ?? null },
      })) as OnboardingRow[];
    },
  });

  if (roleLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground text-sm">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Respostas dos Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Diagnóstico de onboarding — {responses?.length ?? 0} resposta(s)
          </p>
        </div>
      </div>

      {responses && responses.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Cliente</TableHead>
                <TableHead>Percepção</TableHead>
                <TableHead>Ambição</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[120px]">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">
                    {r.profile?.display_name || "Sem nome"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={r.question_1}>
                    {r.question_1 || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={r.question_2}>
                    {r.question_2 || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={r.question_3}>
                    {r.question_3 || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.completed ? "default" : "secondary"}>
                      {r.completed ? "Concluído" : "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhuma resposta de onboarding encontrada.
        </div>
      )}
    </div>
  );
}
