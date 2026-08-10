# Substituir a lupa girando por "Nós de IA orbitando"

## Contexto
A animação atual (`SearchScan`) usa uma lupa girando, que remete a um scanner/SEO genérico — não combina com o que a Ivero faz. A Ivero audita como **múltiplos modelos de IA** percebem e recomendam uma marca. O loading deve representar essa mecânica: consultar várias IAs ao redor de uma marca.

## Mudança
Substituir o SVG da lupa por uma animação de **nós de IA orbitando**: um ponto central (a marca) com 3-4 nós orbitando em raios/velocidades diferentes, cada um representando um modelo de IA (ChatGPT, Gemini, Claude, etc.).

### Detalhes visuais
- **Centro:** ponto sólido representando a marca auditada.
- **Órbitas:** 3-4 nós pequenos orbitando em raios e velocidades distintos, criando profundidade e movimento orgânico (não sincronizado).
- **Trilhas:** círculos tracejados sutis marcando as órbitas.
- **Cores:** usar `hsl(var(--primary))` (token semântico, mantém dark/light).
- **Mesma API:** componente continua `{ className?: string }`, mesmas dimensões `h-24 w-24`, para os dois pontos de uso permanecerem idênticos.

### Escopo de arquivos
- `src/components/ui/search-scan.tsx` — reescrever o SVG interno mantendo export `SearchScan` (nome/default). Alternativa: renomear para `ai-nodes.tsx` + atualizar os 2 imports. Preferência: manter o nome do arquivo/export para tocar só o componente e não os call sites, a menos que o usuário queira renomear.
- `src/pages/PreviewPage.tsx` — **sem mudança** (usa `<SearchScan />`).
- `src/pages/OnboardingSitePage.tsx` — **sem mudança** (usa `<SearchScan />`).

## Validação
- Verificar visualmente os dois loadings (preview gate e onboarding) via Playwright screenshot.
- Confirmar que ambos os pontos continuam renderizando a animação sem erro.
