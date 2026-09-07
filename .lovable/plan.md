# Limpeza de contas de teste + migração Asaas para produção

Nada foi executado. Abaixo o que encontrei e o que proponho.

## Parte 1 — Contas de teste

### O que existe hoje
88 contas cadastradas. Praticamente todas são de teste. Fora do padrão "teste" ficam apenas:

- fernandocanevari@gmail.com (a sua, com perfil de administrador)
- renan@gomesdacosta.com.br
- fernando@viacaogarcia.com.br
- fernando@renata.com.br
- fazenda03@gmail.com
- 6 contas "Teste QA" com endereço @example.com (qafull.../qapartial...) — são de teste, apesar do domínio diferente

Dados vinculados a contas hoje: perfis (88), marcas (71), assinaturas (86), respostas do onboarding (49), concorrentes (149), diagnósticos salvos (41), histórico de análises (13), onboarding do cliente (27), progresso do painel (25), planos de ação (7), campanhas (4). Sem registros em conteúdo gerado, monitoramento e simulações.

Além disso: 3 contatos capturados na landing (1 claramente de teste) e 12 propostas comerciais (11 de teste).

### Regra de identificação proposta
Marcar como teste quem cair em qualquer destes casos:
- endereço contendo `@teste.com.br`, `@iverotest`, `@ivero-test`, `qa+`, `qafull`, `qapartial`
- nome exibido começando com "Cliente", "Fazenda" ou "Teste QA"

E proteger explicitamente uma lista de exceções (as 5 contas reais listadas acima), para que nenhuma delas seja apagada mesmo que combine com algum padrão. Fazenda 03 (gmail) fica preservada por estar nessa lista — se você quiser removê-la também, basta dizer.

### Ordem de exclusão (existe restrição, sim)
Duas tabelas (marcas e campanhas) apontam para o usuário sem exclusão automática, então apagar a conta primeiro dá erro. Perfis, assinaturas e permissões se apagam junto com a conta; respostas do onboarding e concorrentes se apagam junto com a marca. Outras seis tabelas guardam o identificador do usuário sem vínculo formal — se não forem limpas, sobra dado órfão.

Ordem correta:
1. planos de ação, diagnósticos salvos, histórico de análises, onboarding do cliente, progresso do painel, conteúdo gerado, monitoramento
2. campanhas
3. marcas (leva respostas do onboarding e concorrentes)
4. propostas e contatos de teste
5. contas de autenticação (leva perfis, assinaturas e permissões)

### Conferência antes de apagar
Primeiro rodo apenas consultas de leitura, para você aprovar a lista exata:
- lista nominal das contas que serão apagadas (nome, e-mail, data)
- lista nominal das contas preservadas
- contagem de linhas que sairão de cada tabela
- verificação de que nenhuma conta preservada entrou na lista

Só depois da sua aprovação executo a limpeza, em uma única transação, e rodo uma checagem final de órfãos.

## Parte 2 — Asaas: sandbox para produção

### O que está travado no código hoje
O endereço do Asaas está fixo no código (`https://sandbox.asaas.com/api/v3`) em três funções: criação de checkout, gestão de assinatura e reconciliação. A chave também é lida com nome fixo de sandbox nessas mesmas três funções. As URLs de retorno já são dinâmicas (usam o domínio de onde a pessoa veio), então não precisam de mudança.

### Proposta
1. Criar dois valores de configuração: o ambiente (`sandbox` ou `producao`) e a chave de produção. Um único trecho compartilhado decide o endereço e a chave, e as três funções passam a usá-lo. Com isso, voltar para sandbox é trocar um valor, sem mexer em código.
2. A chave de sandbox atual continua guardada, como rede de segurança.
3. O aviso de pagamento (webhook) precisa ser criado de novo no painel de produção do Asaas — não há nada automático, são ambientes independentes. Mesma configuração de antes: o mesmo endereço de aviso, o mesmo token de autenticação já guardado, e os mesmos eventos de pagamento, checkout e assinatura.
4. Os clientes e assinaturas criados no sandbox não existem em produção. Como vamos apagar todas as contas de teste, isso deixa de ser problema.

### Checklist de virada
1. Aprovar e executar a limpeza das contas de teste
2. Guardar a chave de produção e definir o ambiente como produção
3. Ajustar as três funções para ler ambiente e chave da configuração
4. Criar o aviso de pagamento no painel de produção com o token existente
5. Conferir que o domínio final está publicado (as URLs de retorno saem dele)
6. Teste real: criar uma conta nova, contratar com valor simbólico, pagar com cartão real, confirmar o retorno automático para o app, a liberação do painel e o registro correto da assinatura
7. Conferir os registros das funções e o histórico de avisos do Asaas nesse teste
8. Estornar/cancelar a cobrança do teste e apagar essa conta de teste
9. Testar também cancelamento e troca de plano com um segundo teste simbólico
10. Só então anunciar o lançamento

### Notas técnicas
- Arquivos afetados na etapa 3: `supabase/functions/create-checkout/index.ts`, `supabase/functions/manage-subscription/index.ts`, `supabase/functions/reconcile-asaas/index.ts` e um novo trecho compartilhado em `supabase/functions/_shared/`.
- Sem migração de esquema; a limpeza é só remoção de dados.
- O token do aviso de pagamento já está guardado e pode ser reaproveitado.
