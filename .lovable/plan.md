## Destacar o rodapé "Incluso em todos os planos" da InvestSection

O texto final está ótimo em conteúdo, mas hoje vive solto, em fonte pequena e cinza, logo abaixo da grade de cards — visualmente parece "letra miúda de contrato" em vez de uma promessa institucional da Ivero.

A proposta é encapsular esse rodapé em um **bloco-âncora** que funcione como selo de garantia da seção, mantendo o tom premium dark/light já estabelecido (sem quebrar a hierarquia dos cards).

### Tratamento visual proposto

Um card horizontal único, centralizado, largura ~max-w-5xl, com:

- **Fundo:** gradiente sutil `from-ivero-purple/5 via-white to-accent/5` com borda `border-ivero-purple/20` e `rounded-2xl`. Sombra leve (`shadow-lg shadow-ivero-purple/5`) para ganhar peso sem competir com os cards.
- **Glow decorativo:** dois blobs blur (purple + accent) nos cantos, baixíssima opacidade — coerente com o resto da seção.
- **Faixa superior fina:** linha de 2px com `bg-ivero-gradient` no topo do card, sinalizando "selo Ivero".
- **Header do bloco:** ícone (ShieldCheck ou Sparkles do lucide) num badge circular gradiente + título curto **"Incluso em todos os planos"** em `font-display`, tamanho `text-lg sm:text-xl`, peso bold, cor foreground (não mais muted).
- **Lista de benefícios:** trocar o parágrafo corrido por uma **grid de 3 colunas (desktop) / 1 coluna (mobile)** com 6 itens curtos e ícones lucide pequenos:
  - Score GEO de Visibilidade
  - Monitoramento de IAs
  - Alertas de menções
  - Relatório semanal por e-mail
  - Suporte prioritário
  - Onboarding estratégico Ivero
  
  Cada item: ícone accent + texto `text-sm font-medium text-foreground/85`. Fica escaneável em 2 segundos em vez de um parágrafo de 3 linhas.
- **Faixa inferior:** separador sutil + linha final centralizada com **"Sem fidelidade • Cancele quando quiser • Evolua conforme sua operação cresce"** em `text-xs uppercase tracking-wider text-muted-foreground`, dando fechamento institucional.
- **Linha "Cada plano inclui todos os recursos do anterior…"**: mantida acima do bloco como legenda fina ligando os cards ao selo, mas deslocada para reforçar a hierarquia (cards → legenda → selo).
- **Animação:** `motion.div` com fade+slide igual ao restante da seção, com `delay` levemente maior para o selo aparecer por último.

### Resultado esperado

O rodapé deixa de ser texto perdido e vira um **"selo de garantia Ivero"** ao final da seção de planos — visualmente alinhado ao restante (gradientes purple/accent, ícones lucide, cards em white com glow), mas com presença suficiente para o executivo ler em 3 segundos: *"qualquer plano que eu escolher, recebo isso"*.

### Arquivos afetados

- `src/components/landing/InvestSection.tsx` — apenas o bloco do rodapé (após o grid de cards). Sem alterações de lógica, preço, planos ou CTAs.

Posso seguir com a implementação?
