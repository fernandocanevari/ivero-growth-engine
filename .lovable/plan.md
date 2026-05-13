## Objetivo
Diferenciar visualmente o link **Entrar** dos demais itens do Navbar (Recursos, Como funciona, Para quem, Preços, Blog, Legal), mantendo a sobriedade do design atual e sem competir com o CTA principal "Ver como apareço nas IAs".

## Hierarquia visual desejada

```text
Itens de menu (texto fraco) → Entrar (texto cheio + chip sutil) → CTA gradiente (botão "hero")
```

## O que mudar

**Arquivo:** `src/components/landing/Navbar.tsx`

Aplicar ao `<a href="/login">` (versão desktop, linha 41):

- Trocar `text-ivero-dark/70` por `text-ivero-dark` (cor cheia, mais firme que os demais).
- Adicionar um pill discreto: `px-3 py-1.5 rounded-full border border-ivero-dark/15 hover:border-ivero-dark/40 hover:bg-ivero-dark/5 transition-all`.
- Manter `text-sm font-medium` para preservar o ritmo tipográfico.

Resultado: o link ganha um contorno fino tipo "ghost button" que o separa dos links de navegação puros sem virar um segundo CTA — o gradiente do "Ver como apareço nas IAs" continua sendo a única cor forte da barra.

## Mobile (linha 77)

No menu mobile (stack vertical), aplicar a mesma diferenciação de forma adaptada:
- `text-ivero-dark` cheio
- Pequena borda superior `border-t border-ivero-dark/10 pt-3 mt-1` separando "Entrar" dos itens de navegação acima dele
- Manter o CTA hero como elemento de fechamento

## Fora do escopo
- Não mexer nos demais links do navbar
- Não trocar o ícone/cor do CTA principal
- Não criar um novo `variant` no Button — basta um `<a>` estilizado, fica mais leve