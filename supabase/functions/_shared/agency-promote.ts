// Promove o plano escolhido de cada marca da agência (plano_pretendido → plano)
// e grava o valor consolidado na assinatura-mãe. Chamado SOMENTE quando o
// pagamento é confirmado (asaas-webhook / reconcile-asaas). Sem efeito para
// contas individuais (não há linhas em agency_brands).
// deno-lint-ignore-file no-explicit-any
import { quoteAgency } from "./agency-pricing.ts";
import { normalizeCiclo, type PlanoKey } from "./pricing.ts";

export async function promoteAgencyIntent(supabase: any, userId: string, assinaturaId: string) {
  if (!userId) return;
  const { data: links } = await supabase
    .from("agency_brands")
    .select("id, brand_id, plano, plano_pretendido")
    .eq("agency_user_id", userId)
    .eq("status", "ativo");
  if (!links || links.length === 0) return;
  for (const l of links) {
    if (l.plano_pretendido) {
      await supabase.from("agency_brands")
        .update({ plano: l.plano_pretendido, plano_pretendido: null }).eq("id", l.id);
      l.plano = l.plano_pretendido;
    }
  }
  const priced = links.filter((l: any) => l.plano).map((l: any) => ({ brand_id: l.brand_id, plano: l.plano as PlanoKey }));
  if (priced.length === 0) return;
  const { data: row } = await supabase.from("assinaturas").select("ciclo_contratado").eq("id", assinaturaId).maybeSingle();
  const q = quoteAgency(priced, normalizeCiclo(row?.ciclo_contratado ?? "mensal"));
  await supabase.from("assinaturas")
    .update({ valor_consolidado: q.total, desconto_volume_pct: q.discountPct }).eq("id", assinaturaId);
  console.log("[agency-promote]", userId, "marcas:", priced.length, "total:", q.total);
}
