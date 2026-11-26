import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { isValidCpfCnpj, maskCpfCnpj, onlyDigits } from "@/lib/document-validation";
import { isValidAddress, isValidPhone, lookupCep, maskCep, maskPhone, normalizeAddress, type BillingGroup, type BillingInput } from "@/lib/billing-profile";

export const CPF_DIALOG_COPY = {
  title: "Antes de abrir o pagamento",
  text: "Para emitir a sua assinatura, o sistema de pagamento precisa de alguns dados de quem vai pagar. Usamos só para a cobrança.",
  label: "CPF ou CNPJ",
  error: "Esse CPF ou CNPJ não parece válido. Confere os números e tenta de novo.",
  cep: "CEP", numero: "Número", rua: "Rua", bairro: "Bairro", cidade: "Cidade", uf: "UF", celular: "Celular (com DDD)",
  addressError: "Confere o CEP, o número e os campos do endereço para continuar.",
  phoneError: "Confere o celular com DDD para continuar.",
  lookupError: "Não encontramos esse CEP. Confere os números ou preencha o endereço abaixo.",
  lookupLoading: "Buscando endereço…",
  confirm: "Continuar para o pagamento",
  loading: "Abrindo o pagamento…",
  back: "Voltar",
} as const;

export const ALL_BILLING_GROUPS: BillingGroup[] = ["documento", "endereco", "celular"];
export function billingGroupForReason(data: unknown): BillingGroup | null {
  const reason = (data as { reason?: string } | null)?.reason;
  if (reason === "documento_necessario" || reason === "documento_invalido") return "documento";
  if (reason === "endereco_necessario" || reason === "endereco_invalido") return "endereco";
  return reason === "celular_necessario" ? "celular" : null;
}
export const isDocumentReason = (data: unknown): boolean => billingGroupForReason(data) !== null;

/** One select of the authenticated user's own profile; only missing groups leave this loader. */
export async function loadOwnDocument(): Promise<BillingGroup[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [...ALL_BILLING_GROUPS];
  const { data } = await supabase.from("profiles")
    .select("cpf_cnpj, celular, cep, logradouro, numero_endereco, bairro, cidade, uf")
    .eq("user_id", user.id).maybeSingle();
  const missing: BillingGroup[] = [];
  if (!isValidCpfCnpj(data?.cpf_cnpj)) missing.push("documento");
  if (!isValidAddress({ ...data, numero: data?.numero_endereco })) missing.push("endereco");
  if (!isValidPhone(data?.celular)) missing.push("celular");
  return missing;
}

interface Props {
  open: boolean;
  onConfirm: (collected: BillingInput) => void;
  onCancel: () => void;
  loading?: boolean;
  initialError?: string | null;
  groups?: BillingGroup[];
}

export function CpfCnpjDialog({ open, onConfirm, onCancel, loading = false, initialError = null, groups = ALL_BILLING_GROUPS }: Props) {
  const [value, setValue] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState(() => normalizeAddress(null));
  const [error, setError] = useState<string | null>(initialError);
  const [manual, setManual] = useState(false);
  const [looking, setLooking] = useState(false);
  const [resolvedCep, setResolvedCep] = useState("");
  const needsAddress = groups.includes("endereco");

  useEffect(() => { if (open) setError(initialError ?? null); }, [open, initialError]);
  useEffect(() => {
    if (!open || !needsAddress) return;
    const cep = onlyDigits(address.cep);
    setResolvedCep("");
    setManual(false);
    setLooking(false);
    if (cep.length !== 8) return;
    const controller = new AbortController();
    let alive = true;
    setLooking(true);
    void lookupCep(cep, controller.signal).then((found) => {
      if (!alive) return;
      setAddress((prev) => ({ ...prev, ...found }));
      setResolvedCep(cep);
    }).catch(() => { if (alive) setManual(true); })
      .finally(() => { if (alive) setLooking(false); });
    return () => { alive = false; controller.abort(); };
  }, [open, needsAddress, address.cep]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || looking) return;
    const collected: BillingInput = {};
    if (groups.includes("documento")) {
      if (!isValidCpfCnpj(value)) { setError(CPF_DIALOG_COPY.error); return; }
      collected.cpfCnpj = onlyDigits(value);
    }
    if (needsAddress) {
      if ((!manual && resolvedCep !== onlyDigits(address.cep)) || !isValidAddress(address)) { setError(CPF_DIALOG_COPY.addressError); return; }
      collected.endereco = normalizeAddress(address);
    }
    if (groups.includes("celular")) {
      if (!isValidPhone(phone)) { setError(CPF_DIALOG_COPY.phoneError); return; }
      collected.celular = onlyDigits(phone);
    }
    setError(null);
    onConfirm(collected);
  };
  const addressField = (field: "logradouro" | "bairro" | "cidade" | "uf", label: string, maxLength: number) => (
    <div className="space-y-1.5" key={field}>
      <Label htmlFor={`billing-${field}`}>{label}</Label>
      <Input id={`billing-${field}`} value={address[field]} maxLength={maxLength}
        onChange={(e) => setAddress((prev) => ({ ...prev, [field]: field === "uf" ? e.target.value.toUpperCase() : e.target.value }))} />
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onCancel(); }}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{CPF_DIALOG_COPY.title}</DialogTitle>
            <DialogDescription>{CPF_DIALOG_COPY.text}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {groups.includes("documento") && <div className="space-y-1.5">
              <Label htmlFor="cpf-cnpj">{CPF_DIALOG_COPY.label}</Label>
              <Input id="cpf-cnpj" inputMode="numeric" autoComplete="off" value={value}
                onChange={(e) => setValue(maskCpfCnpj(e.target.value))} aria-invalid={!!error} />
            </div>}
            {needsAddress && <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="billing-cep">{CPF_DIALOG_COPY.cep}</Label>
                  <Input id="billing-cep" inputMode="numeric" autoComplete="postal-code" value={maskCep(address.cep)}
                    onChange={(e) => setAddress((prev) => ({ ...normalizeAddress(null), numero: prev.numero, cep: onlyDigits(e.target.value).slice(0, 8) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="billing-numero">{CPF_DIALOG_COPY.numero}</Label>
                  <Input id="billing-numero" value={address.numero} maxLength={20}
                    onChange={(e) => setAddress((prev) => ({ ...prev, numero: e.target.value }))} />
                </div>
              </div>
              {looking && <p role="status" className="text-sm text-muted-foreground">{CPF_DIALOG_COPY.lookupLoading}</p>}
              {!manual && resolvedCep && <p role="status" className="text-sm text-muted-foreground">{address.logradouro}, {address.bairro}, {address.cidade}/{address.uf}</p>}
              {manual && <>
                <p role="status" className="text-sm text-muted-foreground">{CPF_DIALOG_COPY.lookupError}</p>
                {addressField("logradouro", CPF_DIALOG_COPY.rua, 120)}
                {addressField("bairro", CPF_DIALOG_COPY.bairro, 120)}
                {addressField("cidade", CPF_DIALOG_COPY.cidade, 120)}
                {addressField("uf", CPF_DIALOG_COPY.uf, 2)}
              </>}
            </div>}
            {groups.includes("celular") && <div className="space-y-1.5">
              <Label htmlFor="billing-celular">{CPF_DIALOG_COPY.celular}</Label>
              <Input id="billing-celular" inputMode="tel" autoComplete="tel" value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))} />
            </div>}
            {error && <p id="cpf-cnpj-error" role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>{CPF_DIALOG_COPY.back}</Button>
            <Button type="submit" disabled={loading || looking}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{CPF_DIALOG_COPY.loading}</> : CPF_DIALOG_COPY.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default CpfCnpjDialog;
