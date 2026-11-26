import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { isValidCpfCnpj, maskCpfCnpj, onlyDigits } from "@/lib/document-validation";

// Textos num lugar só, para facilitar ajustes.
export const CPF_DIALOG_COPY = {
  title: "Antes de abrir o pagamento",
  text: "Para emitir a sua assinatura, o sistema de pagamento precisa do CPF ou CNPJ de quem vai pagar. Usamos só para a cobrança.",
  label: "CPF ou CNPJ",
  error: "Esse CPF ou CNPJ não parece válido. Confere os números e tenta de novo.",
  confirm: "Continuar para o pagamento",
  loading: "Abrindo o pagamento…",
  back: "Voltar",
} as const;

/** Respostas do create-checkout que pedem o documento de novo. */
export const isDocumentReason = (data: unknown): boolean => {
  const r = (data as { reason?: string } | null)?.reason;
  return r === "documento_necessario" || r === "documento_invalido";
};

/** Lê o CPF/CNPJ salvo no próprio perfil (só dígitos válidos; senão null). */
export async function loadOwnDocument(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("cpf_cnpj").eq("user_id", user.id).maybeSingle();
  const doc = (data as { cpf_cnpj?: string | null } | null)?.cpf_cnpj ?? null;
  return doc && isValidCpfCnpj(doc) ? doc : null;
}

interface Props {
  open: boolean;
  onConfirm: (documentDigits: string) => void;
  onCancel: () => void;
  loading?: boolean;
  initialError?: string | null;
}

export function CpfCnpjDialog({ open, onConfirm, onCancel, loading = false, initialError = null }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    if (open) setError(initialError ?? null);
  }, [open, initialError]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    if (!isValidCpfCnpj(value)) {
      setError(CPF_DIALOG_COPY.error);
      return;
    }
    setError(null);
    onConfirm(onlyDigits(value));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{CPF_DIALOG_COPY.title}</DialogTitle>
            <DialogDescription>{CPF_DIALOG_COPY.text}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-4">
            <Label htmlFor="cpf-cnpj">{CPF_DIALOG_COPY.label}</Label>
            <Input
              id="cpf-cnpj"
              inputMode="numeric"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(maskCpfCnpj(e.target.value))}
              aria-invalid={!!error}
              aria-describedby={error ? "cpf-cnpj-error" : undefined}
            />
            {error && (
              <p id="cpf-cnpj-error" role="alert" className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              {CPF_DIALOG_COPY.back}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {CPF_DIALOG_COPY.loading}
                </>
              ) : CPF_DIALOG_COPY.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CpfCnpjDialog;
