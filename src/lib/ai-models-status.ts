// Fonte única dos modelos de IA temporariamente em standby.
// Esvazie o array quando todos voltarem para ocultar o banner automaticamente.
export const MODELS_IN_STANDBY: string[] = ["Claude", "Perplexity"];
export const MODELS_ACTIVE: string[] = ["OpenAI", "Gemini", "GPT-5"];
export const TOTAL_MODELS = MODELS_IN_STANDBY.length + MODELS_ACTIVE.length;
