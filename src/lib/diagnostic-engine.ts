/**
 * Diagnostic engine — motor compartilhado do Diagnóstico de Influência em IA.
 *
 * Extraído do PreviewPage para que os dois caminhos de entrada rodem
 * EXATAMENTE a mesma análise:
 *   - Caminho 1: visitante roda no /preview (antes do cadastro)
 *   - Caminho 2: cadastro direto → etapa 3 do onboarding
 *
 * A lógica da edge function `simulate-ai` NÃO é alterada aqui: este módulo
 * apenas invoca (mode: "diagnostico"), agrega os resultados por pilar e
 * monta o payload de exibição/persistência.
 */
import type React from "react";
import { Eye, ShieldCheck, Target, Rocket, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildPerceptionSnapshot } from "@/lib/perception-tags";

export interface PillarCriterion {
  nome: string;
  score: number;
  peso: number;
  justificativa?: string;
  consenso?: { agree: number; total: number };
}

export interface PillarAnalysis {
  name: string;
  mentions: number;
  score: number;
  radarValue: number;
  hasData: boolean;
  criterios: PillarCriterion[];
  aiDetails: { model: string; mentioned: boolean; score: number; justificativa: string }[];
}

export interface AIEngineResult {
  name: string;
  found: boolean;
  error?: boolean;
  errorMessage?: string;
}

export interface RadarPoint {
  subject: string;
  value: number;
  fullMark: number;
}

export interface DiagnosticSuccess {
  ok: true;
  overallScore: number;
  radar: RadarPoint[];
  pillarDetails: ReturnType<typeof buildPillarDetails>;
  keywordCloud: unknown[];
  modelsOk: string[];
  engines: AIEngineResult[];
  partialFailures: number;
  totalModels: number;
}

export interface DiagnosticFailure {
  ok: false;
  failureSummary: Array<{ model: string; errorMessage: string }>;
}

export type DiagnosticResult = DiagnosticSuccess | DiagnosticFailure;

export const PILLAR_KEYS: { key: string; name: string }[] = [
  { key: "clareza", name: "Clareza" },
  { key: "autoridade", name: "Autoridade" },
  { key: "conversao", name: "Conversão" },
  { key: "posicionamento", name: "Posicionamento" },
  { key: "relevancia", name: "Relevância" },
];

export const defaultAiEngines: AIEngineResult[] = [
  { name: "ChatGPT", found: false },
  { name: "Gemini", found: false },
  { name: "Google Modo IA", found: false },
];

export function extractBrandFromUrl(url: string): string {
  try {
    let clean = url.replace(/^https?:\/\//, "").replace(/^www\./, "");
    clean = clean.split("/")[0].split(".")[0];
    return clean || "marca";
  } catch {
    return "marca";
  }
}

/* ── Build dynamic pillar details from analysis ── */
export function buildPillarDetails(pillarResults: PillarAnalysis[]) {
  const pillarConfig: Record<string, { icon: React.ElementType; summaryGood: string; summaryMid: string; summaryBad: string; strengths: string[]; weaknesses: string[]; recGood: string; recBad: string }> = {
    Clareza: {
      icon: Eye,
      summaryGood: "Sua marca comunica de forma direta o que faz e para quem.",
      summaryMid: "Sua comunicação é parcialmente clara, mas pode ser mais direta.",
      summaryBad: "Falta clareza na comunicação — IAs não compreendem sua proposta.",
      strengths: ["Headline objetiva → IA compreende o core business rapidamente", "Benefícios claros → Aumenta chances de recomendação contextual"],
      weaknesses: ["Proposta de valor confusa → IA não sabe o que sua empresa faz", "Mensagem genérica → Reduz diferenciação nas respostas de IA"],
      recGood: "Mantenha a comunicação clara e reforce a diferenciação competitiva.",
      recBad: "Reforce a proposta única de valor e a diferenciação competitiva para maximizar o impacto em respostas de IA.",
    },
    Autoridade: {
      icon: ShieldCheck,
      summaryGood: "Sua marca é reconhecida como autoridade pelas IAs.",
      summaryMid: "Autoridade parcial — algumas IAs reconhecem, outras não.",
      summaryBad: "Autoridade baixa reduz drasticamente a chance de recomendação nas IAs.",
      strengths: ["Reconhecimento detectado → IAs citam sua marca como referência", "Presença online sólida → Base de autoridade identificada"],
      weaknesses: ["Ausência de backlinks de qualidade → IA não reconhece referências externas", "Sem menções em mídia especializada → Reduz credibilidade algorítmica", "Conteúdo técnico insuficiente → Limita profundidade de indexação por IA"],
      recGood: "Continue investindo em conteúdo de autoridade e backlinks de qualidade.",
      recBad: "Invista em backlinks de alta qualidade, menções em mídia especializada e conteúdo técnico aprofundado.",
    },
    Conversão: {
      icon: Target,
      summaryGood: "IAs recomendam sua marca ativamente quando perguntadas.",
      summaryMid: "CTAs presentes mas sem otimização para jornadas vindas de IA.",
      summaryBad: "Baixa conversão — visitantes vindos de IA não se tornam clientes.",
      strengths: ["CTAs visíveis → Caminho de conversão existente", "Formulário acessível → Ponto de contato disponível"],
      weaknesses: ["Sem landing pages para tráfego de IA → Perde visitantes que chegam via respostas", "Ausência de prova social contextual → Reduz taxa de conversão em 40%"],
      recGood: "Otimize as landing pages para visitantes vindos de respostas de IA.",
      recBad: "Crie landing pages específicas para visitantes vindos de respostas de IA, com contexto personalizado e prova social.",
    },
    Posicionamento: {
      icon: Rocket,
      summaryGood: "Posicionamento forte — IAs destacam sua marca no mercado.",
      summaryMid: "Posicionamento técnico sólido, mas falta diferenciação emocional.",
      summaryBad: "Posicionamento fraco faz a IA recomendar concorrentes no seu lugar.",
      strengths: ["Linguagem profissional → Consistência na comunicação", "Foco em valor → Diferenciação por benefício detectada"],
      weaknesses: ["Sem storytelling → IA gera respostas genéricas sobre sua marca", "Elementos aspiracionais ausentes → Reduz engajamento nas recomendações"],
      recGood: "Mantenha o storytelling e adicione mais elementos de diferenciação.",
      recBad: "Adicione elementos aspiracionais e storytelling à comunicação para que IAs gerem respostas mais humanizadas.",
    },
    Relevância: {
      icon: Sparkles,
      summaryGood: "Sua marca é citada em contextos altamente relevantes ao seu nicho.",
      summaryMid: "Relevância parcial — sua marca aparece em alguns contextos do setor.",
      summaryBad: "Baixa relevância contextual — IAs não associam sua marca ao seu nicho.",
      strengths: ["Presença em buscas do setor → IA associa sua marca ao nicho correto", "Citações em contextos relevantes → Reforça autoridade temática"],
      weaknesses: ["Ausência em discussões do setor → IA não conecta sua marca ao nicho", "Falta de conteúdo contextual → Reduz associação temática nas respostas de IA"],
      recGood: "Mantenha a produção de conteúdo relevante ao nicho e amplie a presença em discussões do setor.",
      recBad: "Produza conteúdo altamente relevante ao seu nicho e participe ativamente de discussões e publicações do setor.",
    },
  };

  return pillarResults.map((p) => {
    const config = pillarConfig[p.name];
    if (!config) return null;

    // Sem nenhum modelo válido neste pilar: nada de score, banda ou diagnóstico inventado.
    if (!p.hasData) {
      return {
        name: p.name,
        score: null as number | null,
        hasData: false,
        icon: config.icon,
        color: "muted",
        status: "Sem dados" as const,
        summary: "Nenhum modelo de IA retornou avaliação para este pilar nesta análise.",
        criterios: [] as PillarCriterion[],
        strengths: [] as string[],
        weaknesses: undefined,
        recommendation: "Repita a análise para obter a leitura deste pilar.",
      };
    }

    const status = p.radarValue >= 70 ? "Forte" as const : p.radarValue >= 40 ? "Moderado" as const : "Crítico" as const;
    const summary = p.radarValue >= 70 ? config.summaryGood : p.radarValue >= 40 ? config.summaryMid : config.summaryBad;
    const recommendation = p.radarValue >= 60 ? config.recGood : config.recBad;

    return {
      name: p.name,
      score: p.radarValue as number | null,
      hasData: true,
      icon: config.icon,
      color: p.radarValue >= 70 ? "emerald" : p.radarValue >= 40 ? "amber" : "red",
      status,
      summary,
      criterios: p.criterios,
      strengths: p.mentions > 0 ? config.strengths : [config.strengths[0]],
      weaknesses: p.mentions < 3 ? config.weaknesses : undefined,
      recommendation,
    };
  }).filter(Boolean);
}

/**
 * Roda o diagnóstico completo (1 chamada por modelo via simulate-ai, mode
 * "diagnostico") e agrega os resultados. Nenhum score é fabricado: sem
 * resposta utilizável retorna `ok: false`.
 */
export async function runDiagnostic(brandName: string): Promise<DiagnosticResult> {
  const body = {
    prompt: `Avalie a marca "${brandName}" com base nas informações públicas disponíveis sobre seu site e presença digital.`,
    brandName,
    mode: "diagnostico",
  };

  const callSimulateAi = async () => {
    const first = await supabase.functions.invoke("simulate-ai", { body });
    // Retry automático 1x apenas para falha de transporte/timeout (sem payload utilizável).
    if (first.error || !first.data?.results) {
      console.warn("simulate-ai transport failure, retrying once in 2s:", first.error);
      await new Promise((r) => setTimeout(r, 2000));
      return await supabase.functions.invoke("simulate-ai", { body });
    }
    return first;
  };

  try {
    const { data, error } = await callSimulateAi();

    if (error || !data?.results) {
      console.error("Diagnostico call failed:", error);
      return {
        ok: false,
        failureSummary: [
          { model: "simulate-ai", errorMessage: error?.message || "Sem resposta da análise (timeout ou indisponibilidade)." },
        ],
      };
    }

    if (data.allModelsFailed) {
      return { ok: false, failureSummary: Array.isArray(data.errorSummary) ? data.errorSummary : [] };
    }

    const modelResults: any[] = data.results;
    const partialFailures = modelResults.filter((r: any) => r?.error === true).length;

    // Base de modelos que realmente responderam. Modelos com error: true são
    // excluídos da média e a lista é persistida para que deltas comparem
    // análises com a mesma base de modelos.
    const modelsOk: string[] = modelResults
      .filter((r: any) => !r?.error)
      .map((r: any) => String(r?.model ?? ""))
      .filter(Boolean)
      .sort();

    const results: PillarAnalysis[] = PILLAR_KEYS.map(({ key, name }) => {
      const aiDetails = modelResults.map((r) => {
        const pillar = r.pillars?.[key];
        const score = !r.error && typeof pillar?.score === "number" ? pillar.score : 0;
        const justificativa = pillar?.justificativa || (r.errorMessage ?? "");
        return { model: r.model, mentioned: !r.error && score >= 50, score, justificativa };
      });

      const validScores = modelResults
        .filter((m) => !m.error && typeof m.pillars?.[key]?.score === "number")
        .map((m) => m.pillars[key].score as number);
      const hasData = validScores.length > 0;
      const avgScore = hasData
        ? Math.round(validScores.reduce((s, v) => s + v, 0) / validScores.length)
        : 0;

      const mentions = aiDetails.filter((a) => a.mentioned).length;

      const validModelPillars = modelResults
        .filter((m) => !m.error && Array.isArray(m.pillars?.[key]?.criterios))
        .map((m) => m.pillars[key].criterios as Array<{ nome: string; score: number; peso: number; justificativa?: string }>);

      const criterios: PillarCriterion[] = [];
      if (validModelPillars.length > 0) {
        const numCriterios = Math.min(3, ...validModelPillars.map((arr) => arr.length));
        for (let i = 0; i < numCriterios; i++) {
          const ref = validModelPillars.find((arr) => arr[i])?.[i];
          if (!ref) continue;
          const scores = validModelPillars.map((arr) => arr[i]?.score).filter((s) => typeof s === "number");
          const avg = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
          const CONVERGENCE_TOLERANCE = 15;
          const agree = scores.filter((s) => Math.abs(s - avg) <= CONVERGENCE_TOLERANCE).length;
          const consenso = { agree, total: scores.length };
          const justificativas = validModelPillars
            .map((arr) => arr[i]?.justificativa)
            .filter((j): j is string => typeof j === "string" && j.trim().length > 0);
          const justificativa = justificativas.sort((a, b) => b.length - a.length)[0];
          criterios.push({ nome: ref.nome, score: avg, peso: ref.peso, justificativa, consenso });
        }
      }

      return { name, mentions, score: avgScore, radarValue: avgScore, hasData, criterios, aiDetails };
    });

    // Score geral = média apenas dos pilares que realmente têm dado de modelo.
    const scoredPillars = results.filter((r) => r.hasData);
    if (scoredPillars.length === 0) {
      return {
        ok: false,
        failureSummary: modelResults
          .filter((r: any) => r?.error)
          .map((r: any) => ({ model: r.model, errorMessage: r.errorMessage || "Resposta incompleta." })),
      };
    }

    const overallScore = Math.round(
      scoredPillars.reduce((sum, r) => sum + r.radarValue, 0) / scoredPillars.length
    );

    // Radar mostra apenas pilares com leitura real (0 seria uma afirmação falsa).
    const radar: RadarPoint[] = scoredPillars.map((r) => ({ subject: r.name, value: r.radarValue, fullMark: 100 }));
    const pillarDetails = buildPillarDetails(results);
    const keywordCloud = Array.isArray(data.keyword_cloud) ? data.keyword_cloud : [];

    const engines: AIEngineResult[] = modelResults.map((r) => {
      if (r.error) {
        return { name: r.model, found: false, error: true, errorMessage: r.errorMessage };
      }
      const scores = PILLAR_KEYS
        .map((p) => r.pillars?.[p.key]?.score)
        .filter((s: unknown): s is number => typeof s === "number");
      const avg = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
      return { name: r.model, found: avg >= 50 };
    });

    return {
      ok: true,
      overallScore,
      radar,
      pillarDetails,
      keywordCloud,
      modelsOk,
      engines,
      partialFailures,
      totalModels: modelResults.length,
    };
  } catch (e) {
    console.error("Pillar analysis failed:", e);
    return {
      ok: false,
      failureSummary: [
        { model: "simulate-ai", errorMessage: e instanceof Error ? e.message : "Erro inesperado na análise." },
      ],
    };
  }
}

/** Score de um pilar no radar (null quando o pilar não teve leitura). */
export function pillarScore(radar: RadarPoint[], subject: string): number | null {
  const found = radar.find((r) => r.subject === subject);
  return found ? found.value : null;
}

/**
 * Persiste o diagnóstico exatamente como foi exibido ao cliente:
 * sessionStorage (leitura imediata no dashboard) + audit_reports (snapshot
 * navegável) + analysis_history (série do gráfico de evolução).
 */
export async function persistDiagnostic(opts: {
  userId: string;
  siteUrl: string;
  source: "preview" | "reanalise" | "onboarding";
  result: DiagnosticSuccess;
  writeAnalysisHistory?: boolean;
}) {
  const { userId, siteUrl, result } = opts;
  const source = opts.source === "onboarding" ? "preview" : opts.source;

  try {
    sessionStorage.setItem(
      "ivero:lastDiagnostic",
      JSON.stringify({
        siteUrl,
        geoScore: result.overallScore,
        radar: result.radar,
        pillarDetails: result.pillarDetails,
        keyword_cloud: result.keywordCloud,
        models_ok: result.modelsOk,
        savedAt: new Date().toISOString(),
      })
    );
    sessionStorage.setItem("ivero:audit_adopted", "1");
  } catch {
    /* storage indisponível (modo privado) */
  }

  const { error: auditError } = await supabase.from("audit_reports").insert({
    user_id: userId,
    source,
    site_url: siteUrl,
    overall_score: result.overallScore,
    status_label: "",
    radar_data: result.radar as never,
    pillar_details: result.pillarDetails as never,
    keyword_cloud: result.keywordCloud as never,
    ai_engines: [] as never,
  } as never);
  if (auditError) console.warn("audit_reports insert failed:", auditError.message);

  if (opts.writeAnalysisHistory) {
    const clarity = pillarScore(result.radar, "Clareza") ?? 0;
    const authority = pillarScore(result.radar, "Autoridade") ?? 0;
    const conversion = pillarScore(result.radar, "Conversão") ?? 0;
    const positioning = pillarScore(result.radar, "Posicionamento") ?? 0;
    const experience = pillarScore(result.radar, "Relevância") ?? 0;

    const { error: historyError } = await supabase.from("analysis_history").insert({
      user_id: userId,
      overall_score: result.overallScore,
      clarity_score: clarity,
      authority_score: authority,
      conversion_score: conversion,
      positioning_score: positioning,
      experience_score: experience,
      perception_snapshot: buildPerceptionSnapshot({
        clarity, authority, conversion, positioning, experience,
      }) as unknown as never,
      keyword_cloud: result.keywordCloud as never,
      models_ok: [...result.modelsOk].sort() as never,
    } as never);
    if (historyError) console.warn("analysis_history insert failed:", historyError.message);
  }
}
