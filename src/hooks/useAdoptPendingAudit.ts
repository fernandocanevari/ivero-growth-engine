import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { adoptPreviewSnapshot } from "@/lib/existing-diagnostic";
import { toast } from "@/hooks/use-toast";

/**
 * Quando um lead anônimo roda o /preview e depois cria conta + entra no
 * dashboard, esta hook "adota" o snapshot que ficou em sessionStorage e
 * grava como audit_report no banco — assim ele aparece no histórico
 * mesmo se o cliente fechar a aba.
 *
 * A adoção principal acontece no signup/pós-login (AuthPage). Aqui é a rede
 * de segurança. Falha agora é VISÍVEL: o cliente precisa saber que o
 * diagnóstico não foi salvo, em vez de sumir num console.warn.
 */
export function useAdoptPendingAudit() {
  const queryClient = useQueryClient();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const result = await adoptPreviewSnapshot(user.id);
        if (result.status === "adopted") {
          queryClient.invalidateQueries({ queryKey: ["audit-reports"] });
          queryClient.invalidateQueries({ queryKey: ["has-diagnostic"] });
        } else if (result.status === "failed") {
          toast({
            title: "Não conseguimos salvar seu diagnóstico",
            description:
              "O resultado que você viu não foi gravado na sua conta. Rode o Diagnóstico IA para gerar de novo.",
            variant: "destructive",
          });
        }
      } catch (e) {
        console.error("Audit adoption error:", e);
        toast({
          title: "Não conseguimos salvar seu diagnóstico",
          description: "Rode o Diagnóstico IA para gerar o resultado novamente.",
          variant: "destructive",
        });
      }
    })();
  }, [queryClient]);
}
