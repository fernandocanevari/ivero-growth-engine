## Auditoria de QA pré-lançamento — Achados

Varredura no código procurando: textos hardcoded errados, duplicações funcionais, inconsistências de comunicação, links quebrados, placeholders esquecidos.

---

### 🔴 Críticos (mentira ou inconsistência visível ao usuário)

**1. Sidebar mostra "Plano Pro" para TODO mundo (hardcoded)**
`DashboardSidebar.tsx:246` — o footer da sidebar exibe `<p>Plano Pro</p>` fixo, mesmo para usuário em trial ou plano gratuito. Quem está em trial vê "Plano Pro" enquanto vê banners pedindo upgrade. Quebra de confiança.
**Fix:** ler de `useSubscriptionStatus()` e exibir `Trial` / `Influência` / `Autoridade` / `Domínio` / `Admin` conforme o caso.

**2. FAQ da landing menciona "Microsoft Copilot" — não monitoramos**
`FAQSection.tsx:27` — diz que monitoramos "ChatGPT, Gemini, Perplexity, Claude **e Microsoft Copilot**". A função `simulate-ai` roda apenas 5 modelos (OpenAI, Gemini, Claude, Perplexity, GPT-5). Promessa não entregue.
**Fix:** trocar por "ChatGPT (OpenAI), Gemini (Google), Claude (Anthropic), Perplexity e GPT-5".

**3. PromptTester e Simulador são funcionalmente iguais**
Ambos chamam `simulate-ai` com um prompt e mostram resultado por modelo. PromptTester só mostra badges "menciona/não menciona"; Simulador mostra a resposta completa. Para o usuário final, são a mesma coisa em duas telas — confusão de IA.
**Fix:** remover **Prompt Tester** do menu (manter rota viva por enquanto, escondida) ou renomear para algo distinto de verdade ("Teste em Lote" se for para virar bulk testing). Recomendo remover do sidebar.

---

### 🟡 Médios (UX / placeholder ainda visível)

**4. Link da Central de Ajuda só existe no SupportWidget flutuante, não no sidebar**
A rota `/dashboard/ajuda` está implementada mas não tem item no menu lateral. Usuário que feche o widget perde acesso.
**Fix:** adicionar "Ajuda" no grupo Extras do sidebar.

**5. Ícones duplicados no sidebar**
- `Mail` em **Leads** e **Convites** (admin)
- `FileText` em **Planos de Ação** (user) e **Propostas** (admin)
- `TrendingUp` em **Evolução Estratégica** e **Score GEO**
**Fix:** trocar Convites para `Send`, Propostas para `FileSignature`, Score GEO para `Gauge`.

**6. Página Configurações tem seção "Em breve" exposta**
`ConfiguracoesPage.tsx:181` — bloco "Em breve — configurações de notificação serão adicionadas aqui." Em produção é melhor esconder a seção ou marcá-la como Beta.
**Fix:** remover a seção até ter conteúdo, ou mover para "Roadmap" na página de Ajuda.

**7. Página Diagnóstico tem comentário "TODO: Replace with real plan status check"**
`DiagnosticoPage.tsx:197` — não é visível ao usuário, mas indica lógica de plano não implementada. Verificar se afeta paywall.

---

### 🟢 Baixos (cosmético / verificar)

**8. AssinaturaPage diz "Demonstração — gateway em breve"**
Esperado por enquanto (Stripe não conectado). Confirmar se é OK manter no lançamento ou se preferimos esconder a página até integrar pagamento.

**9. `AssinaturaPage.tsx:113` mostra "/ teste"**
O sufixo "/ teste" no preço pode confundir — está claro que é "por mês"?

**10. DashboardOverview empty state diz "Em breve seu score aparecerá aqui"**
OK contextualmente, mas reforçar que o cálculo leva X minutos seria mais tranquilizador.

---

### O que NÃO encontrei (validado, está OK)

- Nenhum `Lorem ipsum` ou texto placeholder genérico
- Nenhum `console.log` exagerado (só 8 ocorrências, todas em `console.error` legítimo)
- CORS dos edge functions configurado corretamente
- Rotas batendo com sidebar (todas as páginas existentes têm rota)
- Banner "3 de 5 modelos ativos" funcionando como esperado
- Português acentuado correto nos textos visíveis (acentuação OK em headings, descrições, FAQ, blog)

---

## Plano de correção (priorizado)

### Bloco 1 — Críticos (obrigatório antes do lançamento)
1. `DashboardSidebar.tsx` → exibir plano real do usuário no footer
2. `FAQSection.tsx` → corrigir lista de IAs monitoradas (remover Copilot)
3. `DashboardSidebar.tsx` → remover item "Prompt Tester" do menu (rota fica)

### Bloco 2 — Médios (recomendado)
4. `DashboardSidebar.tsx` → adicionar item "Ajuda" no grupo Extras
5. `DashboardSidebar.tsx` → trocar ícones duplicados (Convites/Propostas/Score GEO)
6. `ConfiguracoesPage.tsx` → remover bloco "Em breve" de notificações

### Bloco 3 — Verificações manuais (você no QA)
7. Confirmar se quer manter `/dashboard/assinatura` visível com gateway em modo demo
8. Validar fluxo completo: signup → onboarding → diagnóstico → dashboard
9. Validar /preview → email capture → adoção pós-signup
10. Testar /convite/:slug e /propostacomercial/:slug em mobile

---

Quer que eu implemente os **Blocos 1 e 2** agora? Ou prefere revisar item a item antes?