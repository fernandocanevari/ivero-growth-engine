

## Mover bloco "Como chegamos a esse score" para o Dashboard (clientes pagantes)

### Contexto e validação

Confirmei pelas memórias e pela arquitetura atual:
- `PreviewPage` é **público** (qualquer um gera diagnóstico) → expor a rubrica ali revela a metodologia para concorrentes.
- `DiagnosticoPage` (no `/dashboard/diagnostico`) está atrás de `ProtectedRoute` → só clientes autenticados acessam.
- A memória `mem://features/dashboard/access-logic` confirma que o Diagnóstico IA é tratado como acesso pago.

Sobre o **badge "X/5 IAs"**: ele foi implementado dentro do bloco "Como chegamos a esse score" no `PreviewPage`. Como o usuário não o vê, provavelmente o diagnóstico exibido foi gerado **antes** da atualização (o `criterios` vem do `sessionStorage` do diagnóstico anterior, sem o campo `consenso`). Ao mover o bloco para o dashboard, o badge passa a ser visto lá — mas só renderiza quando o diagnóstico é refeito após a atualização.

### O que muda

**1. `src/pages/PreviewPage.tsx` — remover o bloco do preview público**
- Remover o JSX `"Como chegamos a esse score"` de cada card de pilar (mini-barras, badges X/5, tooltips de justificativa).
- **Manter** o badge de faixa (Crítico/Insuficiente/Sólido/Referência) ao lado do score do pilar e do GEO geral — esses não revelam metodologia.
- **Manter** o cálculo e armazenamento de `criterios` em `sessionStorage` (`pillarDetails`) — é o dado que o dashboard vai consumir.
- Adicionar uma nota discreta no lugar do bloco removido: *"Detalhamento por sub-critério disponível no dashboard executivo após assinatura"* (1 linha, cinza, opcional).

**2. `src/pages/dashboard/DiagnosticoPage.tsx` — receber o bloco completo**
- Em cada card de pilar, adicionar o bloco **"Como chegamos a esse score"** (abaixo da Definição, antes de Análise/Impacto).
- Ler `criterios` do `pillarDetails` (já salvo pelo PreviewPage) ou do diagnóstico salvo no Supabase.
- Renderizar para cada sub-critério:
  - Nome + peso (40%/35%/25%)
  - Mini-barra de progresso colorida pela faixa
  - Score numérico
  - **Badge "X/5 IAs"** (emerald ≥80%, sky ≥50%, amber <50%)
  - Tooltip com justificativa da IA + explicação do consenso (variação ≤15 pts)

**3. PDF Export**
- O botão de exportar PDF está no PreviewPage (após lead capture). Como o bloco sai do preview, o detalhamento dos sub-critérios **não vai mais para o PDF do preview** — o que é coerente (PDF público não deve ter a rubrica).
- Se o dashboard tiver export futuro, o bloco já estará dentro de `data-pdf-section` e será capturado.

### Onde o cliente vai ver cada elemento depois

| Elemento | PreviewPage (público) | DiagnosticoPage (pago) |
|---|---|---|
| Score GEO geral + faixa | ✅ | ✅ |
| Score por pilar + faixa | ✅ | ✅ |
| Sub-critérios + pesos | ❌ removido | ✅ adicionado |
| Badge X/5 IAs | ❌ removido | ✅ adicionado |
| Tooltip de justificativa | ❌ removido | ✅ adicionado |
| Botão Baixar PDF | ✅ (sem rubrica) | — |

### Arquivos modificados

1. `src/pages/PreviewPage.tsx` — remover bloco "Como chegamos a esse score"
2. `src/pages/dashboard/DiagnosticoPage.tsx` — adicionar bloco completo com critérios, mini-barras, badge X/5 e tooltips
3. `mem://features/preview/score-rubric` — atualizar para refletir que o detalhamento é exclusivo do dashboard

