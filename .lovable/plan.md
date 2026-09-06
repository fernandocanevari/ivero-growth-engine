# Diagnóstico dos 2 pontos (sem correção aplicada)

## ITEM 1 — Toggle Mensal/Anual não muda o preço na troca local

O que confirmei no código atual:

- O modal de troca de plano (`UpgradeModal`) calcula o preço certo a partir do toggle: Anual usa o valor promocional, Mensal usa o valor cheio. A leitura em si está correta.
- O toggle começa sincronizado com o ciclo real do cliente (`ciclo_contratado`), uma única vez por carregamento da página.
- No servidor (`manage-subscription`, ação `change_plan`), a troca local durante o trial **grava** `plano` e `ciclo_contratado` no banco — quando o plano muda.

Causa raiz encontrada — **o ciclo só é salvo se o plano também mudar**:

Antes de qualquer gravação existe um atalho: se o plano pedido é igual ao plano atual, a função responde "nada a fazer" (`noop`) e sai — sem gravar o ciclo escolhido. Ou seja, quem só quer trocar Anual → Mensal (mantendo o mesmo plano) tem a escolha descartada silenciosamente: a resposta é de sucesso, o modal fecha, e o cartão da Assinatura volta a mostrar o valor anual, porque no banco o ciclo nunca mudou. Isso explica exatamente o sintoma "o preço continua sendo o do Anual independente do que eu escolho".

Fator secundário (cosmético, mesmo quando o plano muda):

- Depois de uma troca bem-sucedida, o toggle não é ressincronizado — ele só sincroniza uma vez por carregamento de página. Reabrindo o modal na mesma sessão ele pode mostrar o ciclo antigo.
- Existe ainda uma janela de corrida: se o cliente clicar em "Mensal" **antes** de os dados da assinatura terminarem de carregar, a sincronização inicial chega depois e joga o toggle de volta para "Anual". É mais raro na página de Assinatura (os dados já carregaram), mas é real.

Correção que proponho (para aprovação):

1. No servidor, tratar "mesmo plano, ciclo diferente" como troca válida: gravar `ciclo_contratado` (e recalcular o valor) em vez de responder `noop`. Só responder `noop` quando plano **e** ciclo são idênticos.
2. No modal, ressincronizar o toggle a cada abertura e não sobrescrever uma escolha manual do cliente depois que os dados chegarem.
3. Permitir clicar no plano atual quando o ciclo escolhido é diferente do contratado (hoje esse caminho parece "sem efeito").

## ITEM 2 — Banner "Comece por aqui: Prompt Tester" piscando no Painel

Fonte de dados: é **diferente** dos hooks já corrigidos. O banner depende de duas coisas:

1. As respostas do onboarding (P1/P2/P3), lidas por uma consulta própria (`useOnboardingResponses`) que não tem nenhuma proteção contra revalidação: sem `staleTime`, sem `placeholderData`, e com recarga automática ao voltar o foco da aba.
2. O estado da assinatura/permissões, para nunca recomendar algo bloqueado.

Por que pisca:

- Enquanto qualquer uma das duas fontes está "carregando", o componente devolve `null` — some da tela inteira e depois reaparece com animação de entrada (opacidade 0 → 1), o que dá o efeito de piscada.
- A consulta do onboarding recarrega do zero em várias situações: o cache global é **limpo por completo** em eventos de autenticação (inclusive `SIGNED_IN`/`USER_UPDATED`, que ocorrem em renovação de sessão), e o padrão do app é considerar o dado velho imediatamente.
- Além disso, o hook de assinatura não é um cache compartilhado: cada componente que o usa mantém seu próprio estado local, então a proteção "não voltar a carregando" que aplicamos antes vale só dentro de uma instância viva — se o componente remonta, ele volta ao estado inicial de carregando.

Correção que proponho (para aprovação):

1. Dar à consulta do onboarding o mesmo tratamento das outras: `staleTime` de alguns minutos, manter o dado anterior durante revalidação e não recarregar ao focar a aba.
2. No banner, distinguir "primeira carga" de "revalidação": só esconder na primeira carga; durante revalidação, manter o que está em tela.
3. Rodar a animação de entrada apenas uma vez (não a cada novo render), para que nem uma revalidação rápida cause flash.
4. Revisar o `queryClient.clear()` em eventos de autenticação para não limpar tudo em renovação de sessão (só em troca real de usuário / logout) — essa é a origem comum que pode afetar outros cartões também.

## Observação

Nada foi alterado. Aprovando, aplico Item 1 (servidor + modal) e Item 2 (consulta + banner + limpeza de cache) nessa ordem, e testo: troca só de ciclo com o mesmo plano refletindo no cartão de Assinatura, troca de plano em trial, e alternância de aba/foco no Painel sem piscada.
