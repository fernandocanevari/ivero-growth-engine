## 2 Surgical Changes

### Change 1 — Model fallback in Edge Function
File: `supabase/functions/ivero-analyze/index.ts`
- In `callAnthropic`, before the generic `!resp.ok` throw, add an explicit `if (resp.status === 404)` check that throws a descriptive Portuguese error message naming the model and suggesting the user verify the model ID is still valid at Anthropic.
- Do not change model constants or any other logic.

### Change 2 — Transparency disclaimer on results page
File: `src/pages/IveroAnalysisPage.tsx`
- Below the score gauge and above the pillar cards grid, insert a small centered disclaimer in muted text explaining that the audit is based on inferred public signals and does not access the website directly.
- Do not alter scores, pillar cards, or any other UI element.