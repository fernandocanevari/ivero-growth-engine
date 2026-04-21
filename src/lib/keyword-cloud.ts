/**
 * Keyword Cloud — vocabulário com que as IAs descrevem a marca.
 *
 * Termos extraídos pela função edge `simulate-ai` (modo diagnóstico) a partir
 * das respostas dos 5 modelos. Persistidos em `analysis_history.keyword_cloud`.
 *
 * Helpers puros: agregação por período, diff entre auditorias, escala de fonte.
 */

export type KeywordSentiment = "positive" | "neutral" | "negative";

/** Frase de exemplo extraída de uma resposta de IA, atrelada ao modelo de origem. */
export interface KeywordExample {
  /** Trecho curto (≤ 200 chars) onde o termo (ou variação) aparece. */
  quote: string;
  /** Modelo de IA que produziu o trecho — "ChatGPT", "Gemini", "Claude", "Perplexity", "GPT-5". */
  model: string;
}

/** Força (peso) de um termo dentro de um modelo específico. */
export interface KeywordModelStrength {
  model: string;
  /** Quantidade de menções do termo (ou variação) na resposta desse modelo. */
  count: number;
}

export interface KeywordCloudEntry {
  term: string;
  frequency: number;
  sentiment: KeywordSentiment;
  mentioned_in_models: number;
  /** Frases curtas onde o termo aparece (até ~5). Opcional para retrocompat. */
  examples?: KeywordExample[];
  /** Força do termo por modelo, do mais forte ao mais fraco. Opcional. */
  models?: KeywordModelStrength[];
}

export type KeywordCloud = KeywordCloudEntry[];

/** Type guard — aceita unknown vindo do banco (jsonb). */
export function isKeywordCloud(value: unknown): value is KeywordCloud {
  return (
    Array.isArray(value) &&
    value.every(
      (e) =>
        e !== null &&
        typeof e === "object" &&
        typeof (e as KeywordCloudEntry).term === "string" &&
        typeof (e as KeywordCloudEntry).frequency === "number",
    )
  );
}

export function asKeywordCloud(value: unknown): KeywordCloud {
  return isKeywordCloud(value) ? value : [];
}

/**
 * Mescla nuvens de várias auditorias (período 7/30/90/all) somando frequências
 * e modelos, mantendo o sentimento dominante por termo.
 */
export function mergeCloudsAcrossPeriod(clouds: KeywordCloud[]): KeywordCloud {
  const byTerm = new Map<
    string,
    { term: string; frequency: number; mentioned_in_models: number; sentiments: Record<KeywordSentiment, number> }
  >();

  for (const cloud of clouds) {
    for (const entry of cloud) {
      const key = entry.term.trim().toLowerCase();
      if (!key) continue;
      const current = byTerm.get(key) ?? {
        term: entry.term.trim(),
        frequency: 0,
        mentioned_in_models: 0,
        sentiments: { positive: 0, neutral: 0, negative: 0 },
      };
      current.frequency += entry.frequency;
      current.mentioned_in_models = Math.max(current.mentioned_in_models, entry.mentioned_in_models);
      current.sentiments[entry.sentiment] = (current.sentiments[entry.sentiment] ?? 0) + entry.frequency;
      byTerm.set(key, current);
    }
  }

  return Array.from(byTerm.values())
    .map<KeywordCloudEntry>((v) => {
      const dominant = (Object.entries(v.sentiments) as [KeywordSentiment, number][])
        .sort((a, b) => b[1] - a[1])[0][0];
      return {
        term: v.term,
        frequency: v.frequency,
        sentiment: dominant,
        mentioned_in_models: v.mentioned_in_models,
      };
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 30);
}

export interface KeywordCloudDiff {
  added: KeywordCloudEntry[];
  removed: KeywordCloudEntry[];
  kept: KeywordCloudEntry[];
}

/** Diff entre nuvem atual e anterior — usado pelo toggle "Comparar". */
export function diffCloud(current: KeywordCloud, previous: KeywordCloud): KeywordCloudDiff {
  const prevMap = new Map(previous.map((e) => [e.term.trim().toLowerCase(), e]));
  const currMap = new Map(current.map((e) => [e.term.trim().toLowerCase(), e]));

  const added: KeywordCloudEntry[] = [];
  const kept: KeywordCloudEntry[] = [];
  for (const entry of current) {
    if (prevMap.has(entry.term.trim().toLowerCase())) kept.push(entry);
    else added.push(entry);
  }
  const removed: KeywordCloudEntry[] = [];
  for (const entry of previous) {
    if (!currMap.has(entry.term.trim().toLowerCase())) removed.push(entry);
  }
  return { added, removed, kept };
}

/**
 * Tamanho de fonte (px) proporcional à frequência relativa.
 * Clamp 12px–36px para manter legibilidade premium.
 */
export function fontSizeFor(frequency: number, maxFrequency: number): number {
  if (maxFrequency <= 0) return 14;
  const min = 12;
  const max = 36;
  const ratio = Math.max(0, Math.min(1, frequency / maxFrequency));
  return Math.round(min + (max - min) * Math.sqrt(ratio));
}

export function countsBySentiment(cloud: KeywordCloud): Record<KeywordSentiment, number> {
  const counts: Record<KeywordSentiment, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const entry of cloud) counts[entry.sentiment]++;
  return counts;
}

export function totalMentions(cloud: KeywordCloud): number {
  return cloud.reduce((sum, e) => sum + e.frequency, 0);
}

export function maxModels(cloud: KeywordCloud): number {
  return cloud.reduce((max, e) => Math.max(max, e.mentioned_in_models), 0);
}
