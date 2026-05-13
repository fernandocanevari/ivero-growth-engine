import { toast } from "@/hooks/use-toast";

/**
 * Padroniza toasts de erro de mutations para manter linguagem consistente
 * e sempre orientar o usuário com uma ação sugerida.
 *
 * Uso:
 *   onError: mutationErrorToast("salvar a análise")
 *
 * Resultado:
 *   title:       "Não foi possível salvar a análise"
 *   description: "<msg>. Tente novamente em alguns instantes ou recarregue a página."
 */
export function mutationErrorToast(action: string) {
  return (err: Error | { message?: string } | unknown) => {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err && "message" in err
        ? String((err as { message?: string }).message ?? "")
        : "";
    toast({
      title: `Não foi possível ${action}`,
      description: message
        ? `${message}. Tente novamente em alguns instantes ou recarregue a página.`
        : "Tente novamente em alguns instantes ou recarregue a página.",
      variant: "destructive",
    });
  };
}

export function mutationSuccessToast(title: string, description?: string) {
  toast({ title, description });
}
