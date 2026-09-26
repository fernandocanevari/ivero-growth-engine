import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import { useAgencyBrands } from "@/hooks/useAgencyBrands";
import { PLANOS, formatBRL, type PlanoSugerido } from "@/lib/pricing-rules";
import { quoteAgency, VOLUME_TIERS, type Ciclo } from "@/lib/agency-pricing";

const KEYS: PlanoSugerido[] = ["presenca", "influencia", "autoridade"];

export default function AgencyBillingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userId } = useAuthUserId();
  const { data: brands = [], isLoading } = useAgencyBrands();
  const [ciclo, setCiclo] = useState<Ciclo>("mensal");
  const [choice, setChoice] = useState<Record<string, PlanoSugerido>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data: sub } = useQuery({
    queryKey: ["agency-sub", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("assinaturas")
        .select("status, ciclo_contratado, asaas_subscription_id, valor_consolidado, desconto_volume_pct")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { status: string; ciclo_contratado: string; asaas_subscription_id: string | null; valor_consolidado: number | null; desconto_volume_pct: number | null } | null;
    },
  });
  const paid = sub?.status === "ativo" && !!sub?.asaas_subscription_id;

  useEffect(() => {
    if (sub?.ciclo_contratado === "anual" || sub?.ciclo_contratado === "mensal") setCiclo(sub.ciclo_contratado);
  }, [sub?.ciclo_contratado]);

  useEffect(() => {
    setChoice((prev) => {
      const next = { ...prev };
      for (const b of brands) {
        if (!next[b.id]) next[b.id] = ((b.plano ?? b.plano_pretendido) as PlanoSugerido) || "presenca";
      }
      return next;
    });
  }, [brands]);

  const planosFor = (ids: string[]) => ids.map((id) => choice[id] ?? "presenca");
  const quote = useMemo(() => quoteAgency(planosFor(brands.map((b) => b.id)), ciclo), [brands, choice, ciclo]); // eslint-disable-line react-hooks/exhaustive-deps

  const activate = async () => {
    setBusy("checkout");
    try {
      const { data: prof } = await supabase.from("profiles").select("nome_completo, display_name, email").eq("user_id", userId!).maybeSingle();
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          plano: "presenca",
          nome: prof?.nome_completo || prof?.display_name || "Agência",
          email: prof?.email || "",
          ciclo,
          agency: { brands: brands.map((b) => ({ brand_id: b.id, plano: choice[b.id] })) },
        },
      });
      if (error || !data?.checkoutUrl) throw new Error(data?.error || error?.message || "Não foi possível abrir o pagamento.");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      toast({ title: "Erro ao ativar", description: (e as Error).message, variant: "destructive" });
      setBusy(null);
    }
  };

  const addBrand = async (brandId: string) => {
    setBusy(brandId);
    try {
      const { data, error } = await supabase.functions.invoke("agency-manage-brand", {
        body: { action: "add_brand", brand_id: brandId, plano: choice[brandId] },
      });
      if (error || !data?.ok) throw new Error(data?.message || data?.error || error?.message);
      toast({
        title: "Marca incluída na assinatura",
        description: data.proRata
          ? `Nova mensalidade ${formatBRL(data.after.total)}. Cobrança proporcional de ${formatBRL(data.proRata.value)} enviada.`
          : `Nova mensalidade ${formatBRL(data.after.total)}.`,
      });
      qc.invalidateQueries({ queryKey: ["agency-brands"] });
      qc.invalidateQueries({ queryKey: ["agency-sub"] });
    } catch (e) {
      toast({ title: "Não foi possível incluir", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) return <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />;

  const pending = brands.filter((b) => !b.plano);

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => navigate("/dashboard/marcas")}>
        <ArrowLeft className="h-4 w-4" /> Todas as marcas
      </Button>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Assinatura da agência</h1>
        <p className="text-sm text-muted-foreground">
          Uma única cobrança mensal para todas as marcas, com desconto por volume.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {[...VOLUME_TIERS].reverse().map((t, i, arr) => (
          <span key={t.min} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
            <Percent className="h-3 w-3" />
            {arr[i + 1] ? `${t.min}–${arr[i + 1].min - 1}` : `${t.min}+`} marcas: {t.pct}%
          </span>
        ))}
      </div>

      {!paid && (
        <div className="inline-flex rounded-lg border border-border p-1">
          {(["mensal", "anual"] as Ciclo[]).map((c) => (
            <button
              key={c}
              onClick={() => setCiclo(c)}
              className={`px-3 py-1.5 text-sm rounded-md ${ciclo === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {c === "mensal" ? "Mensal" : "Anual (12 meses)"}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {brands.map((b, i) => {
          const locked = paid && !!b.plano;
          return (
            <div key={b.id} data-testid="agency-billing-row" className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{b.brand_name || "Marca sem nome"}</p>
                <p className="text-xs text-muted-foreground">
                  {locked ? `Plano ${PLANOS[b.plano as PlanoSugerido].name} · contratado` : paid ? "Ainda fora da assinatura" : "Escolha o plano"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {locked ? (
                  <span className="text-sm font-semibold text-foreground">{formatBRL(quote.values[i])}</span>
                ) : (
                  <>
                    <Select value={choice[b.id]} onValueChange={(v) => setChoice((p) => ({ ...p, [b.id]: v as PlanoSugerido }))}>
                      <SelectTrigger className="w-40" aria-label={`Plano de ${b.brand_name}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KEYS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {PLANOS[k].name} · {formatBRL(ciclo === "mensal" ? PLANOS[k].monthlyPrice : PLANOS[k].annualPrice)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {paid && (
                      <Button size="sm" variant="hero" disabled={busy === b.id} onClick={() => addBrand(b.id)}>
                        {busy === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Incluir"}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-2" data-testid="agency-quote">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal ({brands.length} marcas)</span><span>{formatBRL(quote.subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Desconto por volume ({quote.discountPct}%)</span><span>− {formatBRL(quote.discount)}</span></div>
        <div className="flex justify-between font-semibold text-foreground pt-2 border-t border-border"><span>Total mensal</span><span>{formatBRL(quote.total)}</span></div>
        {!paid && (
          <Button variant="hero" className="w-full mt-3" disabled={busy === "checkout" || brands.length === 0} onClick={activate}>
            {busy === "checkout" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ativar assinatura da agência"}
          </Button>
        )}
        {paid && pending.length === 0 && (
          <p className="text-xs text-muted-foreground pt-2">Todas as marcas estão na assinatura.</p>
        )}
      </div>
    </div>
  );
}
