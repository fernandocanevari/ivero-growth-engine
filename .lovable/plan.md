

## O que vamos resolver

Dois pontos levantados após o signup:

1. **Banner dos 7 dias não foi notado** — provavelmente ele apareceu, mas é tão discreto (gradiente leve, badge de dias só aparece em telas md+) que passou batido no fluxo "criei conta → caí no dashboard".
2. **Falta de área Financeira/Assinatura** — o cliente não tem onde ver: plano atual, valor, data de adesão, forma de pagamento, próxima cobrança, faturas, ou opção de trocar/cancelar.

## Parte 1 — Tornar o banner de trial mais evidente

O banner existe e funciona, mas hoje:
- Usa fundo gradiente sutil (`primary/[0.06]`) que se confunde com o header.
- O badge "7 dias restantes" fica oculto em telas < md.
- Não tem nenhum chamado visual no primeiro acesso.

Alterações em `src/components/dashboard/TrialBanner.tsx`:

- Aumentar contraste: trocar gradiente sutil por fundo sólido `bg-primary/10` com borda inferior mais marcada e ícone com pulse sutil nos primeiros segundos.
- Tornar o badge de dias **sempre visível** (remover `hidden md:inline-flex`), apenas reduzindo padding em mobile.
- Adicionar microcopy mais clara: "Teste grátis por 7 dias — **{N} de 7 dias restantes**".
- Trocar texto truncado em mobile por versão curta porém legível.
- Manter X de dismiss e CTA "Ver planos" → abre `UpgradeModal` (já existe).

Resultado: a usuária verá imediatamente, mas continua podendo dispensar.

## Parte 2 — Criar página `/dashboard/assinatura` (Financeiro)

Nova página acessível pelo sidebar no grupo **Extras**, com ícone `CreditCard` e label "Assinatura".

### Estrutura visual da página

```text
┌──────────────────────────────────────────────────────────┐
│  Assinatura & Pagamento                                  │
│  Gerencie seu plano, forma de pagamento e faturas        │
├──────────────────────────────────────────────────────────┤
│  ┌─ PLANO ATUAL ──────────┐  ┌─ PRÓXIMA COBRANÇA ─────┐ │
│  │ Plano Influência       │  │ R$ 497,00              │ │
│  │ Mensal · R$ 497,00     │  │ em 18 mai 2026         │ │
│  │ [Mudar plano] [Cancel] │  │ Visa •••• 4242         │ │
│  └────────────────────────┘  └────────────────────────┘ │
│                                                          │
│  Forma de pagamento                                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 💳 Visa •••• 4242 · expira 12/2027               │   │
│  │ [Atualizar cartão]                               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Histórico de faturas                                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Data        Valor      Status      Ação          │   │
│  │ 18/04/2026  R$ 497,00  ✓ Paga     [Baixar PDF]  │   │
│  │ 18/03/2026  R$ 497,00  ✓ Paga     [Baixar PDF]  │   │
│  │ 18/02/2026  R$ 497,00  ✓ Paga     [Baixar PDF]  │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Importante — modo "demonstração"

Como a Ivero **ainda não tem gateway de pagamento integrado** (não há Stripe/Paddle conectado, conforme conversamos antes), esta primeira versão será uma **interface visual realista com dados mock**, baseada no que será a estrutura final. Decisões:

- Plano atual: lê de `brand_settings` ou um campo novo (proposta abaixo).
- Faturas e cartão: mock visual, claramente etiquetado como "Demonstração" no canto da página até o gateway estar plugado.
- Botões "Atualizar cartão" / "Mudar plano" / "Cancelar" abrem modal informando "Disponível em breve — entre em contato pelo suporte".

Isso resolve o pedido (cliente vê onde administrar) sem prometer funcionalidade que não existe.

### Mudança opcional no schema (recomendada, mas pode ficar para depois)

Adicionar à tabela `brand_settings` (ou criar `subscriptions` separada) os campos:
- `plan` (text: 'presenca' | 'influencia' | 'autoridade' | 'dominio' | 'free')
- `billing_cycle` (text: 'monthly' | 'annual')
- `subscribed_at` (timestamptz)

Por ora, se a tabela não tiver isso, a página assume "Plano Gratuito (em teste)" para todos os usuários autenticados — coerente com o banner de trial.

### Adicionar item no sidebar

Em `src/components/dashboard/DashboardSidebar.tsx`, grupo **Extras**, adicionar antes de "Configurações":

```text
{ title: "Assinatura", url: "/dashboard/assinatura", icon: CreditCard }
```

### Rota

Em `src/App.tsx`, adicionar:

```text
<Route path="assinatura" element={<AssinaturaPage />} />
```

## Arquivos afetados

- `src/components/dashboard/TrialBanner.tsx` — aumentar contraste e visibilidade do badge.
- `src/pages/dashboard/AssinaturaPage.tsx` — **novo arquivo** (página completa com plano, pagamento, faturas).
- `src/components/dashboard/DashboardSidebar.tsx` — adicionar item "Assinatura" no grupo Extras.
- `src/App.tsx` — registrar a rota `assinatura`.
- Memory `mem://features/dashboard/navigation-structure` — atualizar para refletir o novo item.

## Fora do escopo (próximos passos)

- Integração real com gateway (Stripe/Paddle) — exige escolher provider e habilitar via tooling de pagamentos.
- Trocar plano / cancelar de fato — depende do gateway.
- Geração real de faturas em PDF — depende do gateway.

Quando quiser plugar pagamento real, basta me avisar e eu rodo o fluxo de recomendação de provider (Stripe vs Paddle) e conecto.

