## Contexto

Os dois itens já têm uma primeira versão no projeto:

- `src/components/dashboard/DashboardSidebar.tsx` já aplica `bg-primary/12`, `ring-1 ring-primary/20`, `font-semibold` no estado ativo + barra lateral com glow via `[[aria-current=page]_&]`.
- `src/components/dashboard/DashboardSidebar.test.tsx` já cobre: link existe, sidebar permanece montada após clicar em "Dashboard", e `aria-current=page` só na rota exata.

O plano abaixo refina o que já existe para resolver os pontos que ainda confundem o usuário (itens "somem" no fundo claro dos cards do dashboard) e amplia os testes para cobrir o fluxo "clicar → carregar página → sidebar ainda lá".

---

## 1. Contraste dos itens do menu (hover, ativo, selecionado)

Objetivo: tornar cada estado visualmente distinto **e** mais contrastado em relação aos cards brancos do dashboard.

**Estado idle (padrão)**
- Cor de texto sobe de `text-muted-foreground` para `text-foreground/75` — leitura mais firme sobre branco.
- Ícone com `text-muted-foreground` separado do label, criando hierarquia.

**Estado hover**
- `hover:bg-secondary/70 hover:text-foreground`
- Ícone passa para `text-foreground` no hover (transição suave).
- Cursor pointer explícito e `transition-colors duration-150`.

**Estado selecionado/ativo (`aria-current=page`)**
- Fundo mais sólido: `bg-primary/15` (sobe de `/12`).
- Texto: `text-primary font-semibold`.
- `ring-1 ring-primary/25` + `shadow-sm` para destacar do card adjacente.
- Barra lateral esquerda mantida (1×24 px, glow primary) — já implementada.
- Ícone também em `text-primary`.

**Estado focus-visible (teclado)**
- `focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background`.

**Aplicação consistente**
- Garantir que todos os grupos (Visão Geral, Inteligência, Ações, Extras e Administração) compartilhem exatamente o mesmo conjunto de classes para idle/hover/active — sem variações entre grupos.
- Itens "locked" (trial) mantêm `opacity-55`, mas com `hover:opacity-100` para feedback ao passar.

Arquivo afetado: `src/components/dashboard/DashboardSidebar.tsx` (apenas classes Tailwind, sem mudança de estrutura).

---

## 2. Testes de persistência da sidebar

Estender `src/components/dashboard/DashboardSidebar.test.tsx` com cenários novos, mantendo os existentes:

1. **Clicar em "Dashboard" e renderizar a página de destino** — adicionar um `<Route path="/dashboard" element={<div>Conteúdo Dashboard</div>} />` no harness, clicar no link e verificar que **(a)** o conteúdo da página aparece e **(b)** a sidebar (`text=Ivero` + link "Dashboard") continua no DOM.
2. **Navegar entre sub-rotas mantém a sidebar** — começar em `/dashboard`, clicar em "Diagnóstico IA", verificar que a sidebar permanece e que `aria-current=page` migrou para o novo item.
3. **Reload simulado** — desmontar e remontar o `<Harness initialPath="/dashboard" />`, garantir que a sidebar volta com o item Dashboard marcado como ativo.
4. **Estado ativo visual** — após navegar para `/dashboard`, conferir que o link "Dashboard" recebe a classe `bg-primary/15` (via `toHaveClass`) confirmando que o tratamento de contraste é aplicado.

Arquivos afetados:
- `src/components/dashboard/DashboardSidebar.test.tsx` (adicionar cenários).

---

## Detalhes técnicos

- Nenhuma mudança em hooks, rotas, dados ou backend.
- Sem novos pacotes — usa Tailwind tokens semânticos (`primary`, `secondary`, `foreground`, `muted-foreground`) já definidos em `index.css`/`tailwind.config.ts`, respeitando o tema claro do dashboard.
- Testes continuam em Vitest + Testing Library + `MemoryRouter`, sem dependências novas.
- Verificação final: rodar a suíte de testes da sidebar e validar visualmente em `/dashboard` no preview.
