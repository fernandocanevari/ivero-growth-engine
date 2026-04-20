

## Corrigir lead gate: validação rigorosa + sempre forçar cadastro novo

### Diagnóstico do problema

Dois bugs combinados causam o comportamento relatado:

**Bug 1 — Sessão persistida vaza para o lead.** O `localStorage` do navegador guarda uma sessão Supabase de outro usuário (provavelmente o admin que testou antes). Quando o lead preenche o gate e clica em qualquer CTA ("Criar minha conta", "Quero subir de patamar"), ele vai pra `/auth?mode=signup&email=...`. Mas a `AuthPage` tem este código (linhas 67–73):

```ts
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) navigate("/dashboard", { replace: true });
});
```

Resultado: se já existe sessão de outro usuário, o lead é jogado direto no dashboard daquele cliente, sem nem ver o formulário de cadastro. **Isso é um vazamento de dados grave.**

**Bug 2 — Validação de e-mail fraca no lead gate.** O input usa só `type="email"` do HTML5, que aceita formatos como `joao@gmail` (sem TLD) em alguns navegadores. Sem schema de validação real, leads inválidos entram na base e ainda assim "avançam" no fluxo.

---

### Solução

#### 1. `PreviewPage.tsx` — validação rigorosa do lead gate

Adicionar schema **Zod** dentro de `handleLeadSubmit`:

```ts
const leadSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo").max(100),
  email: z.string().trim().email("E-mail inválido").max(255)
    .refine(v => /\.[a-z]{2,}$/i.test(v), "E-mail incompleto (ex: nome@empresa.com)"),
  site: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(20).optional(),
});
```

Se a validação falhar, mostrar o erro com `toast({ variant: "destructive" })` e **não** marcar `leadSubmitted = true`. O formulário continua visível para correção.

#### 2. `PreviewPage.tsx` — limpar sessão antiga ao desbloquear o gate

Antes de redirecionar para `/auth`, garantir que **qualquer sessão antiga seja encerrada** para que o lead chegue à página de cadastro limpa. Nova função helper:

```ts
const goToSignup = async () => {
  // Se houver uma sessão antiga (admin de teste, outro user), faz logout
  // antes de mandar para /auth — assim o lead vê o formulário de cadastro
  // em vez de ser jogado no dashboard alheio.
  const { data: { session } } = await supabase.auth.getSession();
  if (session) await supabase.auth.signOut();
  navigate(buildSignupUrl());
};
```

Trocar todos os `navigate(buildSignupUrl())` da `PreviewPage` (botão "Criar minha conta — é grátis", "Quero subir de patamar" e qualquer outro CTA dark) por `goToSignup()`.

#### 3. `AuthPage.tsx` — não auto-redirecionar quando vier do lead gate

Hoje, se a página `/auth` é aberta com **sessão pré-existente**, ela manda direto pro dashboard. Isso está correto para usuário voltando, mas **errado quando há `?mode=signup&email=...&name=...`** vindo do lead gate (significa que é alguém novo querendo se cadastrar).

Mudança no `useEffect` da `AuthPage` (linhas 65–80):

```ts
const cameFromLeadGate = Boolean(prefEmail || prefName || prefSite || prefPhone);

supabase.auth.getSession().then(async ({ data: { session } }) => {
  if (session) {
    if (cameFromLeadGate && session.user.email !== prefEmail) {
      // Lead diferente do user logado → faz logout para mostrar form de cadastro
      await supabase.auth.signOut();
      return;
    }
    navigate("/dashboard", { replace: true });
  }
});
```

Mesma proteção no `onAuthStateChange`: só redirecionar para `/dashboard` se o e-mail da sessão bater com o pré-preenchido (ou se não houver pré-preenchimento).

#### 4. `PreviewPage.tsx` — feedback de sucesso após desbloqueio

Após `setLeadSubmitted(true)`, mostrar um toast verde discreto: *"Análise completa desbloqueada"*. Isso confirma a ação para o lead, evitando a sensação de "aconteceu algo estranho" que o usuário relatou.

---

### Arquivos modificados

- `src/pages/PreviewPage.tsx` — validação Zod no `handleLeadSubmit`, helper `goToSignup` que faz logout antes de navegar, toast de sucesso
- `src/pages/AuthPage.tsx` — bloquear auto-redirect quando lead novo chegar com sessão de outro user

