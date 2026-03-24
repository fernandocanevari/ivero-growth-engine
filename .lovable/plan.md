

## Corrigir nomes dos secrets na Edge Function

**Problema**: O código usa nomes com casing diferente dos secrets configurados no Supabase.

| No código (atual) | No Supabase (correto) |
|---|---|
| `key_open_IA` | `key_Open_IA` |
| `Key_Gemini` | `Key_gemini` |

**Correção**: Duas alterações em `supabase/functions/simulate-ai/index.ts`:

- **Linha 17**: `Deno.env.get("key_open_IA")` → `Deno.env.get("key_Open_IA")`
- **Linha 18**: `Deno.env.get("Key_Gemini")` → `Deno.env.get("Key_gemini")`

Após a correção, a função será re-deployed automaticamente e testada com curl para validar que ChatGPT e Gemini respondem corretamente.

