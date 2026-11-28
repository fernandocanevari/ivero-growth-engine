import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { asaasApiKey, asaasBaseUrl, asaasKeyName } from "../_shared/asaas.ts";
import { normalizeCiclo, planValue, COMPROMISSO_MESES, type CicloContratado, type PlanoKey } from "../_shared/pricing.ts";
import { quoteAgency, highestPlan, type AgencyQuote } from "../_shared/agency-pricing.ts";
import { trialEligibility, isUpgradeBlocked, effectiveTrialEndsAt } from "../_shared/trial-eligibility.ts";
import { checkoutSchedule, preserveCheckoutState, previousCheckoutAction, resumableCancelledAccess } from "../_shared/checkout-state.ts";
import { planDisplayName } from "../_shared/plan-names.ts";
import { isPenaltyPending, PENALTY_COLUMNS, penaltyBlockedMessage, type PenaltyRow } from "../_shared/penalty.ts";
import { isValidCpfCnpj, onlyDigits } from "../_shared/document.ts";
import { BILLING_MESSAGES, isValidAddress, isValidPhone, normalizeAddress, type BillingAddress } from "../_shared/billing-profile.ts";


const ASAAS_BASE_URL = asaasBaseUrl();

// Valores lidos do módulo compartilhado — fonte canônica: src/lib/pricing-rules.ts.
// O valor cobrado depende do ciclo escolhido: mensal = valor cheio (sem
// compromisso), anual = valor promocional com compromisso de 12 meses
// (rastreado localmente; no Asaas a recorrência é MONTHLY nos dois casos).
const PLANOS_VALIDOS = ["presenca", "influencia", "autoridade"];

const PLAN_LABELS: Record<string, string> = {
  presenca: "Ivero — Plano Presença",
  influencia: "Ivero — Plano Influência",
  autoridade: "Ivero — Plano Autoridade",
};

/** Limite usado para a descrição do item do checkout (texto exibido ao cliente). */
const ITEM_DESCRIPTION_MAX = 150;

/**
 * Só a retomada paga com dias restantes (1ª cobrança no futuro) recebe a frase;
 * sem data, devolve a descrição original intacta.
 */
export function resumeItemDescription(base: string, resumeDueDay: string | null): string {
  if (!resumeDueDay) return base;
  const [y, m, d] = resumeDueDay.slice(0, 10).split("-");
  const sentences = `Nada é cobrado hoje. A primeira cobrança é em ${d}/${m}/${y}.`;
  const combined = base ? `${sentences} ${base}` : sentences;
  return combined.length > ITEM_DESCRIPTION_MAX ? sentences : combined;
}

/**
 * P60: dia da 1ª cobrança a exibir na descrição do item. Só individual com
 * cobrança futura por teste (trial concedido) ou retomada (teste ou paga);
 * nos demais casos null → descrição idêntica à de antes.
 */
export function firstChargeDescriptionDay(
  isAgency: boolean,
  trialConcedido: boolean,
  hasResume: boolean,
  nextDueDate: string,
): string | null {
  return !isAgency && (trialConcedido === true || hasResume) ? nextDueDate : null;
}

interface CheckoutBody {
  plano: "presenca" | "influencia" | "autoridade";
  nome: string;
  /** Ignorado no fluxo individual: vale sempre o e-mail da conta (JWT). */
  email?: string;
  /** P22: CPF/CNPJ de quem paga (individual). Ausente = usa profiles.cpf_cnpj. */
  cpfCnpj?: string;
  celular?: string;
  endereco?: BillingAddress;
  /** "upgrade" = cliente existente trocando de plano (retorno próprio). */
  tipo?: "upgrade";
  /** Ciclo escolhido pelo cliente. Ausente = anual (comportamento legado). */
  ciclo?: "mensal" | "anual";
  /** Legado do UpgradeModal: "annual" | "monthly". */
  billing_cycle?: string;
  /** "trocar_plano" = cliente já assinante trocando (servidor decide a rota). */
  intent?: "contratar" | "trocar_plano";
  /** Modo agência: plano de cada marca ativa → 1 assinatura-mãe consolidada. */
  agency?: { brands: { brand_id: string; plano: PlanoKey }[] };
}

const DOC_MESSAGES = {
  documento_necessario: "Para abrir o pagamento, precisamos do CPF ou CNPJ de quem vai pagar.",
  documento_invalido: "Esse CPF ou CNPJ não parece válido. Confere os números e tenta de novo.",
} as const;
export const CHECKOUT_ANTERIOR_EM_CONFERENCIA_MSG =
  "Estamos conferindo o último cadastro do seu cartão, o que costuma levar poucos minutos. Se daqui a pouco este aviso continuar aparecendo, fale com a gente que resolvemos.";
export const CHECKOUT_ANTERIOR_NAO_ENCERRADO_MSG =
  "Não conseguimos encerrar o seu pedido anterior agora. Tente de novo em alguns minutos. Se continuar, fale com a gente.";
const CLIENTE_INDISPONIVEL_MSG =
  "Não conseguimos preparar o seu pagamento agora. Tente de novo em alguns minutos. Se continuar, fale com a gente.";

/** Log sem valores: só status HTTP, códigos de erro do Asaas e nomes de campos. */
function logCustomerError(step: string, status: number, json: unknown) {
  const errors = (json as { errors?: { code?: string }[] } | null)?.errors;
  console.error("create-checkout: customer", JSON.stringify({
    step, status, codes: Array.isArray(errors) ? errors.map((e) => e?.code ?? null) : [],
  }));
}

async function readJson(res: Response): Promise<Record<string, any> | null> {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

/** Complete only missing Asaas customer fields, preserving all non-empty values. */
export async function resolveAsaasCustomer(opts: {
  baseUrl: string;
  headers: Record<string, string>;
  storedId: string | null | undefined;
  userId: string;
  name: string;
  email: string;
  cpfCnpj: string;
  endereco: BillingAddress;
  celular: string;
}): Promise<{ ok: true; id: string; via: "stored" | "externalReference" | "created" } | { ok: false }> {
  const { baseUrl, headers, storedId, userId, name, email, cpfCnpj, endereco, celular } = opts;
  const fields: Record<string, string> = {
    cpfCnpj, postalCode: endereco.cep, address: endereco.logradouro,
    addressNumber: endereco.numero, province: endereco.bairro,
  };
  const complete = async (id: string, customer: Record<string, any>) => {
    const missing: Record<string, string> = {};
    for (const [field, value] of Object.entries(fields)) {
      const current = String(customer[field] ?? "").trim();
      if (!current) missing[field] = value;
      else if ((field === "cpfCnpj" || field === "postalCode" ? onlyDigits(current) : current) !== value) {
        console.warn("create-checkout: customer", JSON.stringify({ field_differs: field, kept: "asaas" }));
      }
    }
    if (!String(customer.phone ?? "").trim() && !String(customer.mobilePhone ?? "").trim()) {
      missing.phone = celular;
      missing.mobilePhone = celular;
    } else {
      for (const field of ["phone", "mobilePhone"]) {
        if (String(customer[field] ?? "").trim() && onlyDigits(customer[field]) !== celular) {
          console.warn("create-checkout: customer", JSON.stringify({ field_differs: field, kept: "asaas" }));
        }
      }
    }
    if (!Object.keys(missing).length) return true;
    const put = await fetch(`${baseUrl}/customers/${encodeURIComponent(id)}`, {
      method: "PUT", headers, body: JSON.stringify(missing),
    });
    if (!put.ok) { logCustomerError("put_missing_fields", put.status, await readJson(put)); return false; }
    console.log("create-checkout: customer", JSON.stringify({ updated_fields: Object.keys(missing) }));
    return true;
  };
  if (storedId) {
    const res = await fetch(`${baseUrl}/customers/${encodeURIComponent(storedId)}`, { method: "GET", headers });
    const json = await readJson(res);
    const stale = res.status === 404 || (res.ok && (json?.deleted === true || json?.removed === true));
    if (!res.ok && !stale) { logCustomerError("get_stored", res.status, json); return { ok: false }; }
    if (!stale) {
      if (!json || !(await complete(storedId, json))) return { ok: false };
      return { ok: true, id: storedId, via: "stored" };
    }
    console.log("create-checkout: customer", JSON.stringify({ step: "get_stored", stale: true, status: res.status }));
  }
  {
    const res = await fetch(`${baseUrl}/customers?externalReference=${encodeURIComponent(userId)}`, { method: "GET", headers });
    const json = await readJson(res);
    if (!res.ok) { logCustomerError("find_external_reference", res.status, json); return { ok: false }; }
    const found = (Array.isArray(json?.data) ? json?.data : []).find(
      (c: Record<string, unknown>) => c?.id && c?.deleted !== true && c?.removed !== true && c?.externalReference === userId,
    );
    if (found) {
      const id = String(found.id);
      const get = await fetch(`${baseUrl}/customers/${encodeURIComponent(id)}`, { method: "GET", headers });
      const customer = await readJson(get);
      const stale = get.status === 404 || (get.ok && (customer?.deleted === true || customer?.removed === true));
      if (!stale) {
        if (!get.ok || !customer) { logCustomerError("get_found", get.status, customer); return { ok: false }; }
        if (!(await complete(id, customer))) return { ok: false };
        return { ok: true, id, via: "externalReference" };
      }
    }
  }
  const payload: Record<string, unknown> = { name, email, ...fields, externalReference: userId, mobilePhone: celular, phone: celular };
  let res = await fetch(`${baseUrl}/customers`, { method: "POST", headers, body: JSON.stringify(payload) });
  let json = await readJson(res);
  let variant = "phone+mobilePhone";
  if (res.status === 400) {
    const description = Array.isArray(json?.errors) ? json.errors.map((e: { description?: string }) => e.description ?? "").join(" ") : String(json?.message ?? "");
    const omit = /mobilePhone/i.test(description) ? "mobilePhone" : /\bphone\b/i.test(description) ? "phone" : null;
    if (omit) {
      logCustomerError("create_retry", res.status, json);
      delete payload[omit];
      variant = omit === "phone" ? "mobilePhone" : "phone";
      res = await fetch(`${baseUrl}/customers`, { method: "POST", headers, body: JSON.stringify(payload) });
      json = await readJson(res);
    }
  }
  if (!res.ok || !json?.id) { logCustomerError("create", res.status, json); return { ok: false }; }
  console.log("create-checkout: customer", JSON.stringify({ phone_variant: variant, worked: true }));
  return { ok: true, id: String(json.id), via: "created" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let lockToken: string | null = null;
  let lockUser: string | null = null;
  let createdCheckoutId: string | null = null;
  let persisted = false;
  try {
    console.log("create-checkout started");
    // 1. Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const claimEmail = typeof claimsData.claims.email === "string" ? claimsData.claims.email : "";
    lockUser = userId;

    // 2. Parse + validate body
    const body = (await req.json()) as CheckoutBody;
    const { nome, email, tipo } = body || ({} as CheckoutBody);
    let plano = body?.plano;
    // Agência: só mensal no lançamento. O ciclo enviado pelo cliente nunca vale
    // no modo agência (quoteAgency segue aceitando "anual" para uso futuro).
    const ciclo: CicloContratado = body?.agency ? "mensal" : normalizeCiclo(body?.ciclo ?? body?.billing_cycle);
    if (body?.agency && (body?.ciclo ?? body?.billing_cycle) !== undefined && normalizeCiclo(body?.ciclo ?? body?.billing_cycle) !== "mensal") {
      console.warn("create-checkout: agência enviou ciclo", body?.ciclo ?? body?.billing_cycle, "— ignorado, forçado mensal");
    }

    // Modo agência: valida que TODAS as marcas ativas da conta vieram com plano
    // e calcula o valor consolidado com desconto de volume no servidor.
    let agencyQuote: AgencyQuote | null = null;
    // Tipo de conta vale para TODA chamada: agência só contrata pelo
    // faturamento consolidado (body.agency), nunca por checkout individual.
    const adm = createClient(supabaseUrl, supabaseServiceKey);
    const { data: prof } = await adm.from("profiles").select("account_type, cpf_cnpj, nome_completo, celular, cep, logradouro, numero_endereco, bairro, cidade, uf").eq("user_id", userId).maybeSingle();
    const isAgencyAccount = prof?.account_type === "agency";
    if (isAgencyAccount && !body?.agency) {
      return new Response(JSON.stringify({
        error: "agencia_usa_faturamento_consolidado",
        message: "Contas de agência contratam pelo faturamento consolidado das marcas.",
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // P26: multa de cancelamento em aberto (em QUALQUER linha do usuário)
    // bloqueia toda nova contratação até ser paga ou perdoada. Linhas antigas,
    // sem dados de multa, nunca bloqueiam. O link de pagamento vem de
    // manage-subscription/pay_penalty, nunca daqui.
    {
      const { data: penaltyRows, error: penaltyError } = await adm
        .from("assinaturas")
        .select(`id, ${PENALTY_COLUMNS}`)
        .eq("user_id", userId);
      if (penaltyError) throw penaltyError;
      const blocking = ((penaltyRows ?? []) as PenaltyRow[]).find(isPenaltyPending);
      if (blocking) {
        const valor = Number(blocking.multa_pendente_valor);
        console.log("create-checkout: bloqueado por multa pendente", userId, valor);
        return new Response(JSON.stringify({
          ok: false,
          reason: "multa_pendente",
          valor,
          ciclos: Number(blocking.multa_pendente_ciclos ?? 0),
          message: penaltyBlockedMessage(valor),
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    if (body?.agency) {
      if (!isAgencyAccount) {
        return new Response(JSON.stringify({ error: "Conta não é de agência." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: links } = await adm.from("agency_brands").select("brand_id")
        .eq("agency_user_id", userId).eq("status", "ativo");
      const activeIds = new Set((links ?? []).map((l) => l.brand_id as string));
      const chosen = (body.agency.brands ?? []).filter((b) => PLANOS_VALIDOS.includes(b?.plano));
      const chosenIds = new Set(chosen.map((b) => b.brand_id));
      if (activeIds.size === 0 || chosen.length !== activeIds.size || [...activeIds].some((id) => !chosenIds.has(id))) {
        return new Response(JSON.stringify({ error: "Escolha um plano para cada marca ativa da agência." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      agencyQuote = quoteAgency(chosen, "mensal");
      plano = highestPlan(chosen.map((b) => b.plano));
      // Intenção por marca: só vira plano vigente no pagamento confirmado.
      for (const b of chosen) {
        await adm.from("agency_brands").update({ plano_pretendido: b.plano })
          .eq("agency_user_id", userId).eq("brand_id", b.brand_id);
      }
    }
    console.log("create-checkout body:", JSON.stringify({ plano, ...(body?.agency ? { nome, email } : {}), tipo, ciclo }));

    if (!plano || !PLANOS_VALIDOS.includes(plano)) {
      return new Response(
        JSON.stringify({ error: "Plano inválido. Use: presenca, influencia ou autoridade." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (body?.agency && (!nome || !email)) {
      return new Response(
        JSON.stringify({ error: "nome e email são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // P22 (individual): documento e e-mail da CONTA, validados antes de
    // qualquer chamada ao Asaas, trava ou gravação. body.email é ignorado.
    let accountEmail = "";
    let customerName = "";
    let documento = "";
    let endereco = normalizeAddress(null);
    let celular = "";
    if (!body?.agency) {
      const docResponse = (reason: keyof typeof DOC_MESSAGES) =>
        new Response(JSON.stringify({ ok: false, reason, message: DOC_MESSAGES[reason] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const docBody = onlyDigits(body?.cpfCnpj);
      if (docBody) {
        if (!isValidCpfCnpj(docBody)) return docResponse("documento_invalido");
        documento = docBody;
      } else if (isValidCpfCnpj(prof?.cpf_cnpj)) {
        documento = onlyDigits(prof?.cpf_cnpj);
      } else {
        return docResponse(prof?.cpf_cnpj ? "documento_invalido" : "documento_necessario");
      }
      const billingResponse = (reason: keyof typeof BILLING_MESSAGES) =>
        new Response(JSON.stringify({ ok: false, reason, message: BILLING_MESSAGES[reason] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const addressSent = body.endereco !== undefined;
      endereco = normalizeAddress(addressSent ? body.endereco : {
        cep: prof?.cep, logradouro: prof?.logradouro, numero: prof?.numero_endereco,
        bairro: prof?.bairro, cidade: prof?.cidade, uf: prof?.uf,
      });
      if (!isValidAddress(endereco)) return billingResponse(addressSent ? "endereco_invalido" : "endereco_necessario");
      celular = onlyDigits(body.celular !== undefined ? body.celular : prof?.celular);
      if (!isValidPhone(celular)) return billingResponse("celular_necessario");
      accountEmail = claimEmail;
      if (!accountEmail) {
        const { data: u } = await adm.auth.admin.getUserById(userId);
        accountEmail = u?.user?.email ?? "";
      }
      if (!accountEmail) {
        return new Response(JSON.stringify({ error: "Conta sem e-mail." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const clean = (v: unknown) => String(v ?? "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
      customerName = clean(nome) || clean(prof?.nome_completo) || accountEmail.split("@")[0];
      const changed: Record<string, string> = {};
      if (docBody && docBody !== prof?.cpf_cnpj) changed.cpf_cnpj = docBody;
      if (body.celular !== undefined && celular !== prof?.celular) changed.celular = celular;
      if (addressSent) {
        const columns = { cep: endereco.cep, logradouro: endereco.logradouro, numero_endereco: endereco.numero, bairro: endereco.bairro, cidade: endereco.cidade, uf: endereco.uf };
        for (const [field, value] of Object.entries(columns)) {
          if (value !== prof?.[field]) changed[field] = value;
        }
      }
      if (Object.keys(changed).length) {
        const { error: profileError } = await adm.from("profiles").update(changed).eq("user_id", userId);
        if (profileError) throw new Error("Falha ao salvar os dados de cobrança.");
        console.log("create-checkout: profile", JSON.stringify({ changed_fields: Object.keys(changed) }));
      }
    }

    // A trava vem ANTES de ler a linha: chamadas concorrentes nunca usam histórico antigo.
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    lockToken = crypto.randomUUID();
    const { data: locked, error: lockError } = await supabaseAdmin.rpc("claim_checkout_creation", { _user_id: userId, _token: lockToken });
    if (lockError || !locked) {
      lockToken = null;
      return new Response(JSON.stringify({ error: "checkout_em_criacao", message: "Já estamos gerando seu link de pagamento. Tente de novo em instantes." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // 3. Idempotência: só reaproveita quando a assinatura já está vinculada ao
    // Asaas (asaas_subscription_id preenchido). Uma linha de trial local, sem
    // vínculo, NÃO bloqueia a criação da Checkout Session — é exatamente o caso
    // de quem está no trial e escolhe o plano para pagar.
    const LIVE_STATUSES = ["ativo", "trial", "inadimplente", "pendente"];
    const { data: existing } = await supabaseAdmin
      .from("assinaturas")
      .select("id, plano, status, asaas_subscription_id, ciclo_contratado")
      .eq("user_id", userId)
      .in("status", LIVE_STATUSES)
      .not("asaas_subscription_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log("create-checkout: assinatura viva já existe", existing.id, existing.status);
      // Assinatura PAGA viva (ativo/inadimplente) pedindo outro plano/ciclo:
      // isso é troca de plano (manage-subscription/change_plan, com pró-rata),
      // nunca 200 com link vazio. Faturamento consolidado da agência fica fora.
      if (
        !body?.agency &&
        isUpgradeBlocked(existing.status as string, existing.plano as string, existing.ciclo_contratado as string, plano, ciclo)
      ) {
        return new Response(JSON.stringify({
          error: "assinatura_ativa_use_troca_de_plano",
          message: "Você já tem uma assinatura ativa. A mudança de plano é feita pela troca de plano, com cobrança só da diferença.",
          plano_atual: existing.plano,
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Assinatura PAGA viva (ativo/inadimplente) com vínculo: a cobrança
      // PENDING é a próxima mensalidade recorrente, nunca um link de checkout.
      // Faturamento consolidado da agência fica fora.
      if (
        !body?.agency &&
        (existing.status === "ativo" || existing.status === "inadimplente") &&
        existing.asaas_subscription_id
      ) {
        console.log("create-checkout: assinatura viva vinculada — sem reaproveitar cobrança recorrente", existing.id, existing.status);
        return new Response(JSON.stringify({
          error: "assinatura_ativa_use_troca_de_plano",
          message: "Você já tem uma assinatura ativa. A mudança de plano é feita pela troca de plano, com cobrança só da diferença.",
          plano_atual: existing.plano,
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Mesmo plano → devolve o checkout da cobrança pendente existente (se houver).
      let checkoutUrl = "";
      if (existing.asaas_subscription_id) {
        try {
          const res = await fetch(
            `${ASAAS_BASE_URL}/payments?subscription=${existing.asaas_subscription_id}&status=PENDING`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "access_token": asaasApiKey() ?? "",
              },
            },
          );
          const json = await res.json();
          checkoutUrl = json?.data?.[0]?.invoiceUrl ?? "";
        } catch (e) {
          console.error("create-checkout: erro ao buscar cobrança existente", e);
        }
      }
      return new Response(
        JSON.stringify({
          success: true,
          reused: true,
          assinaturaId: existing.id,
          plano: existing.plano,
          status: existing.status,
          checkoutUrl,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3a-bis. AUTORIDADE DO SERVIDOR sobre a rota da troca de plano.
    // Quem está em trial VÁLIDO e sem vínculo no Asaas não tem nada a cobrar:
    // a troca é local (manage-subscription/change_plan). Antes essa regra
    // existia só no front — se o estado da assinatura não estivesse resolvido
    // no clique, o cliente caía aqui e via a tela de pagamento. Só vale quando
    // a intenção é explicitamente "trocar_plano"; contratar segue normal.
    if (body?.intent === "trocar_plano") {
      const { data: viva } = await supabaseAdmin
        .from("assinaturas")
        .select("id, status, trial_ends_at, asaas_subscription_id")
        .eq("user_id", userId)
        .in("status", LIVE_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const trialMs = viva?.trial_ends_at
        ? new Date(viva.trial_ends_at as string).getTime()
        : NaN;
      const trialEmCurso = !Number.isNaN(trialMs) && trialMs > Date.now();
      if (viva && viva.status === "trial" && !viva.asaas_subscription_id && trialEmCurso) {
        console.log(
          "create-checkout: rota=troca_local",
          userId,
          "status:",
          viva.status,
          "vinculo:",
          false,
          "plano solicitado:",
          plano,
        );
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "trial_troca_local",
            plano,
            ciclo,
            message: "Durante o teste a troca de plano é imediata, sem cobrança.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 3c. Elegibilidade ao trial (individual e agência): regra única em
    // _shared/trial-eligibility.ts — trial já terminado nunca ganha novo período.
    const { data: history, error: historyError } = await supabaseAdmin
      .from("assinaturas")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (historyError) throw historyError;
    const { trialConcedido, trialEmCursoMs } = trialEligibility(history ?? []);
    console.log(
      "create-checkout: historico =",
      JSON.stringify((history ?? []).map((r) => [r.status, effectiveTrialEndsAt(r), r.ciclos_pagos ?? 0])),
    );
    console.log(
      "create-checkout: trialConcedido =",
      trialConcedido,
      "trialEmCurso =",
      trialEmCursoMs !== null,
    );


    // 3b. Asaas credentials
    const asaasKey = asaasApiKey();
    if (!asaasKey) {
      return new Response(
        JSON.stringify({ error: `${asaasKeyName()} não configurada.` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const asaasHeaders = {
      "Content-Type": "application/json",
      "access_token": asaasKey,
    };

    const schedule = checkoutSchedule(history ?? []);
    const trialEndsAt = schedule.trialEndsAt ? new Date(schedule.trialEndsAt) : null;
    // Cancelou e voltou com dias de acesso restantes (só conta individual):
    // teste grátis → 1ª cobrança no fim do teste original; assinatura paga →
    // 1ª cobrança do novo contrato no dia do data_vencimento. Nada cobrado hoje.
    const resume = !agencyQuote && !trialConcedido ? resumableCancelledAccess(history ?? []) : null;
    const nextDueDate = resume ? resume.nextDueDate : schedule.nextDueDate;
    const value = agencyQuote ? agencyQuote.total : planValue(plano, ciclo);
    console.log("create-checkout: nextDueDate =", nextDueDate, "trialConcedido =", trialConcedido, "retomaTeste =", !!resume && !resume.isPaid, "retomaAcesso =", !!resume?.isPaid);
    const anterior = (history ?? []).find((r) => r.asaas_checkout_id);
    let cancelAnterior = false;
    if (anterior) {
      const action = previousCheckoutAction(anterior, { value, plano, ciclo });
      console.log("create-checkout: checkout anterior", anterior.asaas_checkout_id, "status:", anterior.status, "acao:", action);
      if (action === "blocked") {
        return new Response(JSON.stringify({ error: "checkout_anterior_ativo", message: CHECKOUT_ANTERIOR_EM_CONFERENCIA_MSG }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (action === "reuse") {
        const ctx = anterior.checkout_context as { link?: string } | null;
        return new Response(JSON.stringify({ success: true, reused: true, trialConcedido, checkoutUrl: ctx?.link, asaasCheckoutId: anterior.asaas_checkout_id, agencyQuote }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      cancelAnterior = action === "cancel";
      // "skip": linha cancelada com sessão antiga concluída/expirada — nada a encerrar.
    }

    // P22: cliente do Asaas (individual), dentro da trava claim_checkout_creation.
    let customerId: string | null = null;
    if (!agencyQuote) {
      const alvo = (history ?? []).find((r) => LIVE_STATUSES.includes(r.status ?? "")) ??
        (history ?? []).find((r) => ["expirado", "trial_expirado", "cancelado"].includes(r.status ?? ""));
      const storedId = (alvo?.asaas_customer_id as string | null | undefined) ?? null;
      const resolved = await resolveAsaasCustomer({
        baseUrl: ASAAS_BASE_URL, headers: asaasHeaders, storedId, userId,
        name: customerName, email: accountEmail, cpfCnpj: documento, endereco, celular,
      });
      const indisponivel = () => new Response(
        JSON.stringify({ ok: false, reason: "cliente_indisponivel", message: CLIENTE_INDISPONIVEL_MSG }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!resolved.ok) return indisponivel();
      customerId = resolved.id;
      console.log("create-checkout: customer", JSON.stringify({ via: resolved.via }));
      if (alvo && storedId !== customerId) {
        // Gravação condicional: só onde ainda está o valor lido (ou nulo).
        let q = supabaseAdmin.from("assinaturas").update({ asaas_customer_id: customerId }).eq("id", alvo.id);
        q = storedId ? q.eq("asaas_customer_id", storedId) : q.is("asaas_customer_id", null);
        const { data: bound, error: bindError } = await q.select("id");
        if (bindError || !bound?.length) {
          console.error("create-checkout: customer", JSON.stringify({ step: "persist", conflict: !bindError }));
          return indisponivel();
        }
      }
    }

    if (anterior && cancelAnterior) {
      {
        // Só uma confirmação HTTP bem-sucedida permite trocar a sessão; erros não são prova de cancelamento.
        const canceled = await fetch(`${ASAAS_BASE_URL}/checkouts/${encodeURIComponent(anterior.asaas_checkout_id)}/cancel`, { method: "POST", headers: asaasHeaders });
        console.log("create-checkout: cancelar checkout anterior", anterior.asaas_checkout_id, canceled.status);
        if (!canceled.ok) return new Response(JSON.stringify({ error: "checkout_anterior_ativo", message: CHECKOUT_ANTERIOR_NAO_ENCERRADO_MSG }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 5. URLs de callback. O Asaas só aceita domínio público https cadastrado
    // na conta — localhost/http são rejeitados, então caímos pra produção.
    // Também rejeita query string, por isso usamos rotas limpas que o app
    // redireciona internamente.
    const rawOrigin =
      req.headers.get("origin") ||
      (req.headers.get("referer")
        ? (() => {
            try {
              return new URL(req.headers.get("referer") ?? "").origin;
            } catch {
              return "";
            }
          })()
        : "");
    const isPublicHttps =
      /^https:\/\//.test(rawOrigin) && !/localhost|127\.0\.0\.1/.test(rawOrigin);
    const baseUrl = (isPublicHttps ? rawOrigin : "https://ivero.com.br").replace(/\/$/, "");
    // Upgrade de cliente existente volta por rota própria, para o /bem-vindo
    // mostrar a confirmação enxuta em vez da jornada de onboarding.
    // Reativação paga com dias restantes volta por rota limpa própria (o Asaas
    // rejeita query string); o app a traduz para ...&retomada=1.
    const successUrl = resume?.isPaid
      ? `${baseUrl}/retorno-asaas-retomada`
      : `${baseUrl}${tipo === "upgrade" ? "/retorno-asaas-upgrade" : "/retorno-asaas"}`;
    const cancelUrl = `${baseUrl}/retorno-asaas-cancelado`;
    const expiredUrl = `${baseUrl}/retorno-asaas-expirado`;
    console.log("create-checkout callback urls:", successUrl, cancelUrl, expiredUrl);

    // 6. Checkout Session (POST /checkouts).
    // Diferente do fluxo antigo (customer + subscription + PUT /payments com
    // callback, que o Asaas responde 500 com corpo vazio), aqui o `callback`
    // é aceito e o auto-redirect funciona. P22: no individual passamos o
    // `customer` já criado/reaproveitado (nunca customerData junto); agência
    // segue sem customer.
    const checkoutPayload: Record<string, unknown> = {
      ...(customerId ? { customer: customerId } : {}),
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 60,
      externalReference: userId,
      callback: { successUrl, cancelUrl, expiredUrl, autoRedirect: true },
      items: [
        {
          name: agencyQuote
            ? `Ivero — Agência (${agencyQuote.items.length} marcas)`
            : PLAN_LABELS[plano] ?? `Ivero — Plano ${plano}`,
          description: resumeItemDescription(
            agencyQuote
              ? `${agencyQuote.items.length} marcas${agencyQuote.discountPct ? ` com ${agencyQuote.discountPct}% de desconto por volume` : ""}`
              : ciclo === "anual"
                ? `Plano ${planDisplayName(plano)} com mensalidade promocional e compromisso de ${COMPROMISSO_MESES} meses.`
                : `Plano ${planDisplayName(plano)} com mensalidade sem compromisso.`,
            firstChargeDescriptionDay(!!agencyQuote, trialConcedido, !!resume, nextDueDate),
          ),
          quantity: 1,
          value,
        },
      ],
      subscription: {
        cycle: "MONTHLY",
        nextDueDate,
      },
    };

    const checkoutRes = await fetch(`${ASAAS_BASE_URL}/checkouts`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify(checkoutPayload),
    });

    // Leitura defensiva: o Asaas responde 500 com corpo VAZIO em alguns casos,
    // e um .json() direto derruba a função com "Unexpected end of JSON input".
    const checkoutText = await checkoutRes.text();
    let checkoutJson: Record<string, any> | null = null;
    try {
      checkoutJson = checkoutText ? JSON.parse(checkoutText) : null;
    } catch { /* tratado abaixo */ }
    if (agencyQuote) {
      console.log("create-checkout asaas checkout response:", checkoutRes.status, checkoutText.slice(0, 800));
    }
    const checkoutUrl: string = checkoutJson?.link || checkoutJson?.url || "";
    if (!checkoutRes.ok || !checkoutUrl) {
      if (!agencyQuote) {
        console.error("create-checkout: checkout", JSON.stringify({
          status: checkoutRes.status,
          errors: Array.isArray(checkoutJson?.errors) ? checkoutJson.errors.map((e: { code?: string; description?: string }) => ({ code: e.code, description: e.description })) : [],
        }));
        // No checkout-state write has occurred. Preserve the existing early-return cleanup.
        return new Response(JSON.stringify({ ok: false, reason: "cliente_indisponivel", message: CLIENTE_INDISPONIVEL_MSG }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.error("create-checkout asaas checkout error:", checkoutRes.status, checkoutText);
      const msg = checkoutJson?.errors?.[0]?.description || checkoutJson?.message || "Erro ao criar checkout no Asaas.";
      return new Response(JSON.stringify({ error: msg, details: checkoutJson ?? checkoutText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const asaasCheckoutId: string = checkoutJson?.id ?? "";
    createdCheckoutId = asaasCheckoutId || null;
    const checkoutContextFor = (row: Record<string, unknown> | null) => preserveCheckoutState(row, { value, cycle: "MONTHLY", plano, ciclo }, checkoutUrl);
    console.log(
      "create-checkout: rota=checkout",
      userId,
      "intent:",
      body?.intent ?? "contratar",
      "trialConcedido:",
      trialConcedido,
      "plano:",
      plano,
      "ciclo:",
      ciclo,
    );

    // 7. Persist in assinaturas (service role to bypass RLS for insert).
    // asaas_subscription_id fica nulo aqui: a assinatura no Asaas só passa a
    // existir depois que o cliente conclui o checkout (asaas-webhook grava).
    // P22: o cliente do Asaas já é conhecido no individual (agência: nulo).
    const dataInicio = new Date();
    const dataVencimento = new Date(dataInicio.getTime() + 30 * 24 * 60 * 60 * 1000);
    const novoStatus = trialConcedido ? "trial" : "pendente";

    const assinaturaPayload = {
      asaas_customer_id: customerId,
      asaas_subscription_id: null,
      // Guardamos o id da Checkout Session para permitir reconciliação ativa
      // (consulta direta ao Asaas) caso o webhook não chegue.
      asaas_checkout_id: asaasCheckoutId || null,
      asaas_checkout_created_at: new Date().toISOString(),
      plano,
      status: novoStatus,
      data_inicio: dataInicio.toISOString(),
      data_vencimento: dataVencimento.toISOString(),
      trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : null,
      ciclo_contratado: ciclo,
      compromisso_meses: COMPROMISSO_MESES,
      // compromisso_inicio/ciclos_pagos passam a valer no 1o pagamento
      // confirmado (asaas-webhook). Nova contratação zera a contagem.
      compromisso_inicio: null,
      ciclos_pagos: 0,
    };

    // Não acumular histórico: reaproveitamos a linha viva sem vínculo com o
    // Asaas (trial/pendente local) ou, na falta dela, a linha morta mais
    // recente (expirada OU cancelada — reativação) — sempre update in place —
    // sem alterar as demais linhas do histórico. Reativação nunca ganha trial novo:
    // `trialConcedido` já é false por causa do histórico.
    const DEAD_STATUSES = ["expirado", "trial_expirado", "cancelado"];
    const linhaViva = (history ?? []).find((r) => LIVE_STATUSES.includes(r.status ?? ""));
    const linhaMorta =
      linhaViva ?? (history ?? []).find((r) => DEAD_STATUSES.includes(r.status ?? ""));


    let insertError: { code?: string; message: string } | null = null;

    if (linhaViva) {
      // Assinatura VIVA (trial/pendente/ativa): nada de promover o plano novo
      // antes da confirmação do pagamento. Se o cliente abandonar a tela do
      // Asaas, o plano vigente continua valendo. Gravamos só a INTENÇÃO
      // (plano/ciclo pretendidos) + o id da Checkout Session; a promoção real
      // acontece no asaas-webhook / reconcile-asaas quando o pagamento entra.
      const { error: updateError } = await supabaseAdmin
        .from("assinaturas")
        .update({
          asaas_checkout_id: asaasCheckoutId || null,
          asaas_checkout_created_at: new Date().toISOString(),
          plano_pretendido: plano,
          ciclo_pretendido: ciclo,
          checkout_context: checkoutContextFor(linhaViva),
          status: trialConcedido ? "trial" : "pendente",
          trial_ends_at: effectiveTrialEndsAt(linhaViva),
        })
        .eq("id", linhaViva.id);
      insertError = updateError;
    } else if (resume && linhaMorta) {
      // Retomada (teste OU assinatura paga com dias restantes): mesma gravação.
      // Na paga, data_vencimento e o contrato atual também ficam intactos até o
      // cartão ser registrado (asaas-webhook/resumeSubscriptionPatch).
      // Retomada do teste cancelado: a linha CONTINUA 'cancelado' enquanto o
      // cliente está na tela do Asaas — acesso segue terminando no fim original
      // do teste (data_vencimento/trial_ends_at intactos, sem janela 'pendente').
      // Plano/ciclo só como intenção. O vínculo antigo (assinatura já removida)
      // é descartado. Cartão registrado → asaas-webhook devolve a linha a
      // 'trial' com o mesmo trial_ends_at; abandono → restoreCheckoutState
      // devolve exatamente este estado cancelado.
      const base = { ...linhaMorta, asaas_subscription_id: null };
      const { error: updateError } = await supabaseAdmin
        .from("assinaturas")
        .update({
          asaas_checkout_id: asaasCheckoutId || null,
          asaas_checkout_created_at: new Date().toISOString(),
          asaas_subscription_id: null,
          plano_pretendido: plano,
          ciclo_pretendido: ciclo,
          checkout_context: preserveCheckoutState(base, { value, cycle: "MONTHLY", plano, ciclo }, checkoutUrl,
            resume.isPaid ? { resumePaidUntil: resume.accessUntil } : { resumeTrialEndsAt: resume.trialEndsAt }),
        })
        .eq("id", linhaMorta.id)
        .eq("status", "cancelado");
      insertError = updateError;
    } else if (linhaMorta) {
      const { error: updateError } = await supabaseAdmin
        .from("assinaturas")
        .update({
          ...assinaturaPayload,
          // Preserva o trial original ('pendente' nunca apaga trial_ends_at).
          // Acesso já encerrado: reativação começa um contrato NOVO (contagem
          // zerada); os valores anteriores ficam em checkout_context.prev e
          // voltam com restoreCheckoutState se o checkout for abandonado.
          trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : effectiveTrialEndsAt(linhaMorta),
          ciclos_pagos: 0,
          compromisso_inicio: null,
          desconto_acumulado: null,
          ciclos_no_upgrade: null,
          plano_pretendido: plano,
          ciclo_pretendido: ciclo,
          checkout_context: checkoutContextFor(linhaMorta),
        })
        .eq("id", linhaMorta.id);
      insertError = updateError;

    } else {
      const { error } = await supabaseAdmin
        .from("assinaturas")
        .insert({
          user_id: userId,
          ...assinaturaPayload,
          checkout_context: checkoutContextFor(null),
          plano_pretendido: plano,
          ciclo_pretendido: ciclo,
        });
      insertError = error;
    }

    if (insertError) {
      console.error("create-checkout insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Falha ao registrar assinatura.", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    persisted = true;
    // 8. Return checkout URL
    return new Response(
      JSON.stringify({
        success: true, trialConcedido, checkoutUrl, asaasCheckoutId, agencyQuote,
        ...(resume && !resume.isPaid ? { retomaTeste: true, primeiraCobranca: resume.nextDueDate } : {}),
        ...(resume?.isPaid ? { retomaAcesso: true, primeiraCobranca: resume.nextDueDate, acessoAte: resume.accessUntil } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-checkout error:", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Erro inesperado." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } finally {
    if (createdCheckoutId && !persisted) {
      const key = asaasApiKey();
      if (key) await fetch(`${ASAAS_BASE_URL}/checkouts/${encodeURIComponent(createdCheckoutId)}/cancel`, { method: "POST", headers: { access_token: key } });
    }
    if (lockToken && lockUser) {
      const adm = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      await adm.rpc("release_checkout_creation", { _user_id: lockUser, _token: lockToken });
    }
  }
});
