## Contexto

A aba **Gerador** (`src/components/dashboard/llmstxt/GeradorTab.tsx`) já implementa a **Opção A** — botão "Baixar llms.txt" que gera o arquivo `.txt` a partir do markdown estruturado. Não vou tocar nessa lógica.

A entrega abaixo cobre apenas o que falta (Opção B e Opção D) e respeita a regra de não modificar nada existente: nenhum componente, rota, estilo ou hook atual será alterado. Apenas dois arquivos novos são criados e plugados na aba Gerador através de uma única linha de import + render no final do JSX (sem refatorar nada acima).

## Arquivos novos

1. `src/components/dashboard/llmstxt/DeployGuideSection.tsx` — **Opção B**
2. `src/components/dashboard/llmstxt/DeployValidator.tsx` — **Opção D**

## Alteração mínima no existente

Em `GeradorTab.tsx`, apenas no estado "form preenchido" (após o usuário extrair/gerar o conteúdo), adicionar ao final do JSX, depois do banner "Como usar":

```tsx
<DeployGuideSection />
<DeployValidator defaultUrl={url} expectedMarkdown={markdown} />
```

Nada mais é tocado — sem renomear, sem mover, sem mexer em estilos existentes.

## Opção B — DeployGuideSection

Card com título "Como subir o llms.txt no seu site" + subtítulo curto, seguido de um `Accordion` (shadcn, `type="single"`, `collapsible`) com 5 itens:

- **WordPress** — instalar plugin "WPCode" ou "File Manager"; via File Manager, abrir pasta raiz (`public_html`), enviar `llms.txt`; validar acesso em `seudominio.com/llms.txt`. Observação para usuários de hospedagem gerenciada (Hostinger/Kinsta) usarem o File Manager nativo.
- **Vercel** — colocar `llms.txt` na pasta `public/` do projeto; commit + push; Vercel publica automaticamente em `/llms.txt`. Snippet: `public/llms.txt`.
- **Netlify** — mesma lógica do Vercel: arquivo em `public/` (Vite/React) ou `static/` (Hugo/Next export); deploy via Git ou drag-and-drop em app.netlify.com/drop.
- **cPanel** — abrir File Manager → `public_html` → Upload → enviar `llms.txt` → garantir permissão 644.
- **GitHub Pages** — colocar `llms.txt` na raiz do branch publicado (`main` ou `gh-pages`); commit; aguardar 1–2 min para propagar.

Cada item usa numeração 1/2/3 dentro do conteúdo, code blocks com `font-mono` para caminhos/comandos e ícone `lucide-react` no trigger (ex.: `Server`, `Cloud`, `Github`, `FolderUp`, `Globe`). Visual alinhado ao restante da aba (Card + Accordion já existentes no design system).

## Opção D — DeployValidator

Card com título "Validar instalação". Conteúdo:

- Input (`https://seusite.com/llms.txt`) + botão "Validar agora".
- Pré-preenche com `defaultUrl` (URL que o usuário já digitou no topo da aba), sugerindo automaticamente o sufixo `/llms.txt` se a URL não terminar com isso.
- Ao clicar, faz `fetch(url, { method: 'GET' })` no client (sem edge function nova — a maioria dos sites com `llms.txt` permite CORS público; se bloqueado, exibimos mensagem específica abaixo).

Checks executados sobre a resposta:

1. Status HTTP 200.
2. `content-type` começa com `text/` (preferencialmente `text/plain` ou `text/markdown`).
3. Corpo não vazio e tamanho ≥ 50 bytes.
4. Contém uma linha começando com `# ` (H1 — nome da marca).
5. Similaridade mínima com `expectedMarkdown` gerado: presença do `brandName` (primeira linha `#`) no arquivo remoto. Comparação simples, case-insensitive.

Feedback visual:

- **Sucesso (todos os checks passam)**: bloco verde com `CheckCircle2`, título "llms.txt acessível e válido", lista dos checks com check verde, e link "Abrir arquivo no navegador".
- **Aviso (200 mas algum check falha)**: bloco âmbar com `AlertTriangle`, lista mostrando ✅/❌ por check e causa textual ("Arquivo acessível, mas não contém o nome da marca esperado").
- **Erro (fetch falha, 404, CORS)**: bloco vermelho com `XCircle` + causa específica:
  - `TypeError` no fetch → "Não foi possível acessar (provavelmente CORS bloqueado ou arquivo inexistente). Tente abrir a URL no navegador."
  - 404 → "Arquivo não encontrado. Confirme que está em `/llms.txt` na raiz do domínio."
  - 5xx → "Servidor respondeu com erro {status}."

Estado interno: `idle | loading | success | warning | error` + array de checks. Sem persistência em banco (validação roda no client, sem alterar schema).

## Ordem visual na aba Gerador

Após o usuário gerar o conteúdo, a tela passa a exibir (de cima para baixo, sem mudar o que já existe):

```text
[editor + preview]          ← existente
[Actions: Baixar / Copiar]  ← existente (Opção A já implementada)
[Banner "Como usar"]        ← existente
[DeployGuideSection]        ← novo (Opção B)
[DeployValidator]           ← novo (Opção D)
```

## Detalhes técnicos

- Componentes shadcn já presentes no projeto: `Card`, `Accordion`, `Input`, `Button`, `Label`. Nenhuma dependência nova.
- Ícones: usar `lucide-react` (já em uso).
- Tokens: usar `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted/40`, `text-primary`, `text-emerald-600`, `text-amber-600`, `text-red-600` (mesmo padrão de cores semânticas já adotado em `GeradorTab`).
- Sem mudanças em rotas, sem migration, sem edge function, sem alteração de tipos Supabase.
- Sem mexer em `DiagnosticoTab` nem `MonitoramentoTab` (a aba Diagnóstico já cobre uma verificação mais profunda; o validador da Opção D é um check rápido contextual ao Gerador).

## Fora de escopo

- Não alterar a aba Diagnóstico nem reaproveitar sua lógica (manter independência conforme regra de "não modificar nada existente").
- Não criar deploy automatizado por API (Opção C do plano anterior).
- Não persistir resultados da validação no banco.
