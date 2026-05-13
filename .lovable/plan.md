## Resumo

Atualizar a seção de planos da landing page (`InvestSection`) de 4 para 3 planos, ajustar preços, transferir o destaque visual para o plano do meio, e substituir o card "Domínio" por uma linha de texto de contato. Atualizar também a fonte única de verdade dos preços (`pricing-rules.ts`).

## Arquivos

- `src/components/landing/InvestSection.tsx`
- `src/lib/pricing-rules.ts`

## Mudanças detalhadas

### 1. Remover plano Domínio, manter 3 planos

Remover o quarto item do array `plans` em `InvestSection.tsx`.

### 2. Atualizar preços dos 3 planos restantes

| Plano | Mensal | Anual | Economia/ano |
|-------|--------|-------|--------------|
| Presença | R$ 497 | R$ 397 | R$ 1.200 |
| Influência | R$ 897 | R$ 717 | R$ 2.160 |
| Autoridade | R$ 1.497 | R$ 1.197 | R$ 3.600 |

### 3. Toggle mensal/anual

O toggle já existe na interface (`isAnnual` state). Nenhuma mudança estrutural necessária — apenas garantir que os novos preços e badges de economia funcionem corretamente com a alternância.

### 4. Badge "Mais escolhido" no plano Influência

- Transferir `highlighted: true` do plano Autoridade para o plano Influência.
- No plano Influência, definir `badge: "Mais escolhido"`.
- No plano Autoridade, definir `highlighted: false` e `badge: null`.

### 5. Atualizar CTAs

CTAs já estão conforme solicitado na base de código. Verificar e manter:
- Presença: "Quero ser visto pelas IAs →"
- Influência: "Quero superar meus concorrentes →"
- Autoridade: "Quero dominar meu setor nas IAs →"

### 6. Substituir card Domínio por linha de texto

Após o grid de 3 cards, adicionar uma linha de texto discreta e centralizada:
"Precisa de algo personalizado? Fale com a gente →"
Link: `https://wa.me/SEUNUMERO` (ou fallback para `/preview` se WhatsApp não estiver configurado no projeto).

### 7. Atualizar `pricing-rules.ts`

- Remover `dominio` do tipo `PlanoSugerido` e do objeto `PLANOS`.
- Atualizar `monthlyPrice` e `annualPrice` dos 3 planos restantes conforme tabela acima.
- Ajustar `planoFromScore` para retornar apenas 3 planos (último threshold fica `autoridade`).

## Design / Responsivo

- Grid de cards: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3` (anteriormente era 4).
- Manter todos os estilos existentes (bordas gradientes, glows, tipografia).
- A linha de contato personalizado deve ser discreta: texto `text-sm text-muted-foreground` com link `hover:text-accent`.

## Fora de escopo

- Nenhuma outra página ou funcionalidade será alterada.
- Não modificar o toggle visual existente, apenas os dados.