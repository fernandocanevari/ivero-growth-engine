### Objective
Restore Claude as an active model in the `simulate-ai` edge function.

### Changes

1. **Reactivate Claude config** (`supabase/functions/simulate-ai/index.ts`, lines 61–64)
   - Replace the disabled comment block + `void claudeKey;` with an active `if (claudeKey)` block that pushes a ModelConfig into the `configs` array.
   - Configuration:
     - `name`: `"Claude"`
     - `url`: `"https://api.anthropic.com/v1/messages"`
     - `model`: `"claude-haiku-4-5-20251001"`
     - `getHeaders`: returns `{"x-api-key": claudeKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json"}`
     - `parseResponse`: `(data) => data.content?.[0]?.text ?? ""`
   - The existing Anthropic payload logic (lines 209–216) already handles `config.name === "Claude"`, so no changes needed there.

2. **Standardize model ID** (`supabase/functions/simulate-ai/index.ts`)
   - Replace any occurrence of `"claude-3-5-haiku-latest"` with `"claude-haiku-4-5-20251001"`.
   - *(Audit note: this string was not found in the current file, but the check ensures consistency.)*

3. **Update project memory / comments**
   - Replace the old disabled-Claude comment (`// (Claude desativado temporariamente — chave Key_antropic_claude sem créditos.)`) with:
     - `// Claude reativado em Maio/2026 — mesmo modelo usado em ivero-analyze`
   - Remove the `void claudeKey;` suppression (it becomes the `if (claudeKey)` guard).

### Files touched
- `supabase/functions/simulate-ai/index.ts` only.

### Post-change
- Re-deploy the edge function so the change takes effect.