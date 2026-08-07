# Diagnóstico: Asaas não redireciona de volta pra Ivero

## O que os logs mostram (confirmado)

Última execução do `create-checkout` para o Cliente 30 — `2026-08-07T20:12:59Z`, mesma janela do registro em `assinaturas` (`updated_at 20:12:59.774`, `sub_akzx8bkiz8iv97zu`, status `pendente`):

```text
ERROR create-checkout callback update error: SyntaxError: Unexpected end of JSON input
    at ... index.ts:277:24  (await cbRes.json())
```

Ou seja:

1. O `PUT /payments/{id}` **é** chamado nessa cobrança (o bloco entra, `firstPaymentId` existe).
2. A resposta do Asaas veio com **corpo vazio**, então `await cbRes.json()` lançou antes da linha que loga o status HTTP. O `catch` engoliu o erro (por design, item D) e o fluxo seguiu com o `invoiceUrl` original.
3. Consequência: **o objeto `callback` nunca foi gravado na cobrança**. O registro do domínio no painel do Asaas não mudou nada porque o pedido nem chega a ser aceito — logo, sem `autoRedirect`, a tela "pagamento efetuado" do Asaas não redireciona.

Portanto a causa raiz é o item 3 da sua investigação: o PUT falha silenciosamente. O que **ainda não** está determinado é o *código HTTP e a mensagem* dessa falha, porque o código atual perde essa informação ao parsear JSON antes de logar. Verifiquei que a API do Asaas responde com JSON em erro de credencial (401 `invalid_access_token` retorna corpo), então corpo vazio aponta para outra classe de rejeição (405/404/erro de gateway ou 200 sem corpo) — não vou afirmar qual sem medir.

## Passo 1 — instrumentar e medir (antes de qualquer correção)

No `create-checkout`, trocar a leitura da resposta do PUT por algo que não possa mascarar o erro:

- ler `cbRes.status` e `await cbRes.text()` primeiro, logar sempre, e só então tentar `JSON.parse` dentro de try/catch;
- imediatamente depois, fazer `GET /payments/{firstPaymentId}` e logar o campo `callback` retornado — prova objetiva de se o callback ficou gravado ou não;
- rodar um checkout de teste e ler os logs.

Isso responde em uma execução: status exato, mensagem exata, e estado real da cobrança.

## Passo 2 — correção conforme o que a medição mostrar

Duas rotas prováveis, escolhidas pelo resultado do passo 1:

- **A. Definir o callback na criação, não por update.** Enviar `callback: { successUrl, autoRedirect: true }` já no `POST /subscriptions` (a documentação atual do Asaas lista `callback` no recurso de assinatura; as cobranças geradas herdam). Isso elimina o PUT frágil. Precisa ser confirmado na resposta da própria API antes de virar a solução definitiva.
- **B. Manter o PUT, mas corrigir o payload.** Se o erro indicar campo inválido (ex.: não é permitido reenviar `billingType`/`value`/`dueDate` numa cobrança de assinatura), enviar apenas `callback` e o mínimo exigido.

Em ambos os casos: o `successUrl` continua sendo `https://ivero.com.br/bem-vindo?from=asaas` quando a origem não é HTTPS público — então **testar no domínio publicado, não em localhost**, senão o retorno cai em produção e parece "não redirecionou".

## Passo 3 — condições do lado Asaas (item 2 da sua pergunta)

Independentemente do código, o auto-redirect só ocorre quando:

- o pagamento é **confirmado na hora** (cartão de crédito). Boleto e Pix não têm confirmação síncrona, então a tela final não redireciona — é exatamente o caso coberto pelo fallback `pending` do `/bem-vindo`;
- o domínio do `successUrl` está cadastrado em Minha Conta → Informações (você já fez) e o `successUrl` usa o **mesmo domínio** cadastrado;
- o callback está gravado na cobrança que o cliente efetivamente pagou — não na assinatura nem numa cobrança posterior.

## Detalhes técnicos

- Arquivo envolvido: `supabase/functions/create-checkout/index.ts`, bloco das linhas 251–273.
- Nenhuma mudança de schema; nenhuma mudança no `BemVindoPage` (polling 20× e botões "Verificar novamente"/"Reabrir pagamento" já estão corretos e continuam sendo o fallback).
- Verificação final: log com `callback` preenchido no `GET /payments/{id}` + um checkout de cartão real no domínio publicado voltando para `/bem-vindo?from=asaas` com status virando `ativo` via webhook.
