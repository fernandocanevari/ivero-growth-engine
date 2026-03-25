

## Problemas Identificados

1. **Visibilidade na sidebar**: O Simulador de Influência e o Prompt Tester estão enterrados na seção "Ferramentas", longe do topo. São ferramentas centrais do produto.
2. **Erro silencioso nos modelos**: Quando um modelo retorna erro (429/400), o sistema mostra "Não menciona" em vez de indicar que houve falha, enganando o usuário.

## Plano

### 1. Reorganizar a sidebar para dar destaque ao Simulador e Prompt Tester

Mover o Simulador de Influência e o Prompt Tester para a seção **"Inteligência"**, que é a seção mais visitada e coerente com a proposta dessas ferramentas. A seção "Ferramentas" ficaria apenas com Campanhas (ou seria removida, movendo Campanhas para "Ações").

Nova estrutura proposta:

```text
Visão Geral
  ├── Dashboard
  ├── Diagnóstico IA
  └── Evolução Estratégica

Inteligência
  ├── Monitoramento Multi-IA
  ├── Análise Comparativa
  ├── Dominância por Modelo
  ├── Score GEO
  ├── Análise de Sentimento
  ├── Simulador de Influência    ← movido
  └── Prompt Tester              ← movido

Ações
  ├── Planos de Ação
  ├── Mapa de Prompts
  ├── Alertas
  └── Campanhas                  ← movido (elimina seção Ferramentas)

Extras
  ├── Relatórios
  └── Configurações
```

**Arquivo**: `src/components/dashboard/DashboardSidebar.tsx` -- mover itens entre os arrays `menuGroups`.

### 2. Tratar erros dos modelos de IA na edge function

Atualizar `supabase/functions/simulate-ai/index.ts` para que, quando um modelo retornar erro HTTP (429, 400, etc.), o resultado inclua um campo `error: true` e uma `errorMessage` (ex: "Limite atingido" ou "Sem créditos") em vez de retornar string vazia que é interpretada como "não menciona".

### 3. Exibir estado de erro nos cards do Simulador e Prompt Tester

Atualizar `SimuladorPage.tsx` e `PromptTesterPage.tsx` para reconhecer o campo `error` nos resultados e exibir um badge/estado visual diferente (ex: "Indisponível" em amarelo/cinza) em vez de "Não menciona".

### Arquivos Modificados
- `src/components/dashboard/DashboardSidebar.tsx` -- reorganizar menu
- `supabase/functions/simulate-ai/index.ts` -- retornar info de erro por modelo
- `src/pages/dashboard/SimuladorPage.tsx` -- exibir estado de erro nos cards
- `src/pages/dashboard/PromptTesterPage.tsx` -- exibir estado de erro nos badges

