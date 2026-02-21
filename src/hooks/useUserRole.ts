import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserRole() {
  const query = useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data ?? []).map((r) => r.role);
    },
  });

  return {
    roles: query.data ?? [],
    isAdmin: (query.data ?? []).includes("admin"),
    isLoading: query.isLoading,
  };
}
