## Diagnóstico

Os 5 pilares e o score aparecem zerados porque **todas as 5 contas de IA estão sem créditos/cota**. Confirmado nos logs da edge `simulate-ai`:

- OpenAI (`key_Open_IA`) → 429 `insufficient_quota`
- Gemini (`Key_gemini`) → 429 free tier esgotado
- Claude (`Key_antropic_claude`) → 400 credit balance too low
- Perplexity (via Lovable Gateway) → 402 not enough credits
- GPT-5 (via `LOVABLE_API_KEY`) → 402 not enough credits

O código está correto: quando um modelo falha ele retorna `emptyPillars()` (zeros). Como **todos** falharam, a média ficou 0 em tudo.

## Etapa 1 — Ação fora do código (você faz)

Recarregar/aumentar cota nas 5 contas:

| Provedor | Onde recarregar |
|---|---|
| OpenAI (ChatGPT) | platform.openai.com → Billing |
| Anthropic (Claude) | console.anthropic.com → Plans & Billing |
| Google Gemini | aistudio.google.com → ativar billing no projeto (ou trocar para chave paga) |
| Perplexity | perplexity.ai/settings/api → Buy credits |
| Lovable AI (GPT-5) | Lovable → Settings → Workspace → Usage → Add funds |

Sem isso, qualquer mudança de código continuará retornando 0.

## Etapa 2 — Mudanças no código (eu faço)

### 2.1 Edge `simulate-ai`: sinalizar falha total
- Após agregar os 5 resultados, contar quantos modelos retornaram com `error: true`.
- Se **todos os 5 falharam**, a resposta passa a incluir:
  ```json
  { "allModelsFailed": true, "errorSummary": [{ "model": "...", "errorMessage": "..." }] }
  ```
  com HTTP 200 (para o cliente conseguir ler o JSON sem cair em catch).
- Manter o comportamento atual quando 1–4 modelos falham (média parcial dos que funcionaram).

### 2.2 `PreviewPage.tsx`: tela de erro dedicada
- Detectar `allModelsFailed` na resposta.
- Substituir os cards de pilares/score por um bloco centralizado:
  - Ícone de alerta (Lucide `AlertTriangle`)
  - Título: "Não foi possível concluir a análise agora"
  - Texto: "Estamos com instabilidade temporária nos provedores de IA. Nenhum modelo conseguiu responder. Tente novamente em alguns minutos."
  - Lista compacta dos 5 modelos com seus erros (somente se admin estiver logado, para diagnóstico)
  - Botão primário "Tentar novamente" (re-dispara `simulate-ai`)
  - Botão secundário "Voltar para o início" (→ `/`)
- Toast `sonner` com `toast.error("Provedores de IA indisponíveis")` ao detectar.
- **Não persistir** em `analysis_history` / `audit_reports` quando `allModelsFailed = true` (evita poluir o histórico do dashboard com zeros).

### 2.3 Mensagem mais útil no caso parcial (1–4 falharam)
- Já existe `errorMessage` por modelo. Acrescentar um banner discreto no topo do PreviewPage: "X de 5 modelos indisponíveis no momento — score calculado com os disponíveis." Sem bloquear o fluxo.

## Critérios de aceite

1. Com créditos recarregados: pilares e score voltam a sair > 0.
2. Se eu remover/zerar todas as chaves para testar: aparece a tela de erro clara, sem cards zerados, sem registro novo no histórico.
3. Se 2 modelos caírem: análise continua, com banner de aviso.

## Arquivos afetados

- `supabase/functions/simulate-ai/index.ts` (lógica de agregação + flag)
- `src/pages/PreviewPage.tsx` (tela de erro + banner parcial + bloqueio de persistência)

Sem mudanças de schema ou novos secrets.
