
# Proposta de Valor + Proposta Comercial — Funil consultivo de IA

Duas páginas públicas, sem login, no padrão dark premium do Hero. Funcionam como funil único: o lead entra pelo manifesto, roda um diagnóstico leve da marca e recebe uma proposta comercial personalizada — captura de dados só no CTA final.

## Fluxo

```text
/propostadevalor  ──submit do site──▶  /propostacomercial?url=marca.com
   manifesto +                            loading premium 8s
   CTA agressivo                          ▼
                                          diagnóstico enxuto (5 pilares)
                                          ▼
                                          proposta comercial montada por regras
                                          ▼
                                          CTA "Quero falar com um especialista"
                                              └─▶ modal captura nome+email+telefone
                                                  └─▶ salva em leads (source=proposta_comercial)
```

## Página 1 — `/propostadevalor`

Manifesto disruptivo, scroll fluido, mesmo padrão dark do Hero.

Seções (na ordem):
1. **Hero manifesto** — headline forte ("Sua marca não está sendo encontrada. Está sendo *recomendada*."), input pill idêntico ao Hero da landing + botão "Descubra sua visibilidade em IA" → leva pra `/propostacomercial?url=...`.
2. **O problema** — 3 cards: "Google morreu pra decisão B2B", "ChatGPT virou o novo SDR", "Sua marca está fora dessa conversa".
3. **A virada** — bloco com a tese da Ivero (auditoria de influência em IA, não SEO).
4. **Os 5 pilares** — preview enxuto de Clareza, Autoridade, Posicionamento, Conversão, Relevância (ícones + 1 frase cada).
5. **Por que agora** — urgência (LLMs estão consolidando rankings de marca *agora*).
6. **CTA final repetido** — mesmo input pill do hero, ancora a conversão.

Visual: bg `ivero-dark`, glows roxo/pink parallax, `Space Grotesk` headings, gradiente magenta nos destaques. Sem navbar da landing — header próprio enxuto só com logo Ivero (link pra `/`).

## Página 2 — `/propostacomercial`

Recebe `?url=...` na query. Se vier sem URL, mostra input no topo pra digitar.

Sequência na tela:
1. **Loading premium** — 8s estilo `/preview`, com mensagens estratégicas rotativas ("Consultando ChatGPT…", "Cruzando com Gemini…", "Avaliando os 5 pilares…").
2. **Diagnóstico enxuto** — card grande com:
   - Score geral (0–100) + faixa (Crítico / Insuficiente / Sólido / Referência).
   - 5 pilares em formato de barra horizontal com cor (vermelho/amarelo/verde) e 1 linha de veredito.
   - Sem tabelas, sem sub-critérios, sem nuvem de percepção (isso fica no `/preview` completo).
3. **Diagnóstico executivo** — 1 parágrafo "O que isso significa pra sua marca" gerado por regras simples (template baseado nos pilares mais fracos).
4. **Proposta comercial personalizada** — montada por regras a partir do score:
   - **O que vamos resolver** — bullets dos 2-3 pilares mais fracos, com ação concreta pra cada.
   - **Plano recomendado** — escolhido pela faixa de score:
     - 0–39 → Domínio (situação crítica, precisa de tudo)
     - 40–59 → Autoridade
     - 60–79 → Influência
     - 80–100 → Presença (já está bem, só monitora)
   - **Investimento** — preço do plano + comparativo "vs custo de 1 mês perdido em tráfego de IA".
   - **Próximos passos** — 3 bullets do que acontece após o aceite.
5. **CTA final** — botão grande "Quero falar com um especialista" → abre modal de captura (nome, email, telefone, opcional empresa). Submit grava em `leads` com `source = "proposta_comercial"` e mostra tela de confirmação ("Recebemos seu contato — falaremos em até 24h").
6. **Footer enxuto** — só logo + link pra `/preview` ("Quer ver o diagnóstico completo, com nuvem de percepção e benchmarks? →").

## Diagnóstico leve (nova edge function)

Nova edge function `propose-diagnostic` separada da `simulate-ai` pra controlar custo:
- Roda **2 modelos em paralelo**: Gemini 2.0 Flash (chave própria, custo ~zero) + Claude 3.5 Haiku (chave própria, barato e rápido).
- Reusa o `DIAGNOSTICO_SYSTEM_PROMPT` da `simulate-ai`.
- Score final = média dos 2 modelos por pilar.
- Tempo esperado: 8–12s. Sem extração de nuvem de percepção (economia de chamada Lovable AI).
- Retorna JSON enxuto: `{ overall, pillars: { clareza, autoridade, posicionamento, conversao, relevancia }, status_label }`.
- CORS aberto, sem JWT (é público).

## Lógica da proposta (template por regras)

Arquivo `src/lib/commercial-proposal.ts` puro TypeScript, sem IA:

```text
buildProposal(pillarScores) → {
  diagnosis: string,           // 1 parágrafo baseado nos 2 piores pilares
  weakPoints: Action[],        // 1 ação por pilar < 60
  recommendedPlan: PlanId,     // por faixa de score geral
  comparativeNarrative: string // "Cada mês sem isso = X leads perdidos"
}
```

Mapas estáticos: pilar → ação recomendada + plano → preço + bullets. Zero custo, zero latência.

## Captura de lead

Modal shadcn `Dialog`. Schema Zod igual ao do Hero (nome ≥2, email válido, telefone opcional). Insert em `leads` com `source = 'proposta_comercial'` + campo extra `site` com a URL diagnosticada. RLS atual já permite insert anônimo.

Bônus: salvar o snapshot do diagnóstico em `sessionStorage` (mesma chave que o `useAdoptPendingAudit` já usa) — se o lead virar usuário depois, o diagnóstico migra pra conta dele automaticamente.

## Detalhes técnicos

- **Rotas novas em `App.tsx`** (públicas, fora de `ProtectedRoute`):
  - `/propostadevalor` → `PropostaValorPage`
  - `/propostacomercial` → `PropostaComercialPage`
- **Arquivos novos**:
  - `src/pages/PropostaValorPage.tsx`
  - `src/pages/PropostaComercialPage.tsx`
  - `src/components/proposta/ManifestoHero.tsx`, `ProblemaSection.tsx`, `PilaresPreview.tsx`, `CTAFinal.tsx`
  - `src/components/proposta/DiagnosticoEnxuto.tsx`, `PropostaComercial.tsx`, `LeadCaptureModal.tsx`
  - `src/lib/commercial-proposal.ts` (regras de proposta)
  - `supabase/functions/propose-diagnostic/index.ts` (edge function leve)
- **Reuso**: paleta `ivero-dark`/`ivero-purple`/`ivero-gradient`, glows do Hero, fontes `font-display`, animações Framer Motion já existentes.
- **Sem mudança de schema** — usa tabela `leads` com `source` novo.
- **SEO**: meta tags próprias em cada página (titles/descriptions otimizadas pra venda consultiva), sem entrar no sitemap por enquanto (são páginas de conversão, não conteúdo).
- **Acessível pelo header da landing?** Não — são páginas de funil acionadas por links externos / campanhas / outbound. Sem item de navegação na navbar pública.

## Memória a salvar após build

Nova memory `mem://features/proposta-comercial-funil` descrevendo o fluxo, edge function leve e regras da proposta — pra não recriar isso por engano depois.
