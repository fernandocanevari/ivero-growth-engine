# Vitrine IA v1 — plano

Responde a uma pergunta só: **quando alguém pergunta a uma IA onde comprar o que a sua marca vende, quais lojas a IA cita — e com que frequência a sua marca aparece.**

Não é uma foto de uma consulta. É um acumulado: "a Netshoes apareceu em 8 de 10 rodadas; a sua marca, em 2 de 10".

## Estado atual (já existe no produto, feito antes desta regra)

- Três tabelas no banco: perguntas de compra, rodadas por motor, citações por loja.
- Duas funções de servidor: execução manual de uma pergunta e execução agendada das pendentes.
- Página `/dashboard/vitrine` com selo Beta, item no menu e liberação a partir do plano Influência.
- Validação real feita: ChatGPT e Claude respondendo com lojas brasileiras; Google IA voltou a responder após troca do modelo.

Portanto a v1 não parte de zero: parte de refinamento e fechamento.

## Princípio inegociável

O cálculo dos 5 pilares (Visibilidade IA) **não é tocado**. Nenhuma busca na web entra no motor oficial de score, que continua sem busca e com resposta determinística. A Vitrine IA tem função, tabelas e página próprias.

## Como funciona

1. O cliente cadastra até 10 perguntas de compra ("melhor tênis para maratona", "onde comprar tênis de corrida barato"). Sugestões iniciais vêm do setor e das palavras-chave que já temos da marca.
2. Uma rotina roda essas perguntas periodicamente (semanal por padrão) nos três motores.
3. De cada resposta guardamos: a loja/domínio citado, o nome do produto quando vier, o preço quando vier no mesmo trecho, o link quando vier, e se a marca do cliente foi mencionada.
4. A página mostra o ranking de lojas por taxa de aparição, a posição da marca nesse ranking, e a evolução dessa taxa ao longo das semanas.

### Motores

| Motor | Papel | Comportamento observado |
| --- | --- | --- |
| Claude (com busca) | principal | respostas estáveis entre rodadas, custo previsível; tende ao editorial (cita review/comparativo) |
| Google Modo IA | complemento | o mais barato; link mascarado, mas o domínio real é identificável |
| ChatGPT (com busca) | complemento | único que devolve link direto de página de produto; varia mais entre rodadas |

Cada pergunta roda nos três. O resultado é sempre apresentado por motor, nunca somado num número único.

### Região e idioma — obrigatório

Sem isso o teste real trouxe lojas da Turquia, Japão e Malásia. Três camadas simultâneas: instrução explícita no prompt (Brasil, português), parâmetro de localização/idioma na busca de cada provedor, e descarte de domínios de país não aceito. Marca com atuação regional (cidade/estado, dado que já temos) recebe esse recorte no texto da pergunta.

### Métrica

Frequência de citação por período, calculada na leitura: rodadas com citação do domínio ÷ rodadas do período. Nada de número mágico gravado. Abaixo de 3 rodadas a tela mostra "ainda coletando" e não apresenta a taxa como conclusão.

## Escopo de captura

Loja/domínio, nome da loja, produto, preço (rótulo textual, nunca número de cálculo), link e se o link é mascarado, tipo de fonte (loja / marketplace / review / outro), se é a marca do cliente, e a posição na resposta.

## O que falta fechar na v1

1. **Prompt de compra no Claude** — pedir explicitamente página de compra com preço, reduzindo citação de comparativo/review.
2. **Separação loja x conteúdo na tela** — ranking de lojas em primeiro plano, fontes editoriais em bloco secundário, para o ranking não ser poluído por blog.
3. **Agendamento de verdade** — a execução periódica semanal ligada, com teto por conta e por dia.
4. **Cotas por plano** — teto de perguntas e de rodadas por mês conforme o plano, para o custo não escapar.
5. **Estado inicial da página** — sugestão automática das primeiras perguntas a partir do setor/palavras-chave da marca, em vez de tela vazia.
6. **Resiliência por motor** — quando um motor falha, a rodada continua com os outros e a tela mostra qual motor falhou e por quê.

## Expansão prevista

- **E-commerce e varejo**: para esse público esta é a pergunta central do negócio, e o módulo abre o produto para eles sem mudar o restante da plataforma.
- **Concorrentes nomeados**: acompanhar marcas específicas já cadastradas em concorrentes, e não só o ranking geral.
- **Novos motores**: Perplexity, Copilot e GPT-5 entram como motores adicionais sem mudar as tabelas, porque motor é apenas mais um valor de enum.
- **Alertas**: aviso quando a marca sai do ranking ou quando um concorrente novo aparece com força.

## Custo

Por consulta: Claude ~US$ 0,04–0,08, ChatGPT ~US$ 0,01–0,03, Google praticamente zero. Com 10 perguntas × 3 motores × 4 semanas = 120 consultas/mês por marca → **cerca de US$ 4 a 8 por marca/mês**. Cotas por plano evitam surpresa. A tela já mostra o custo acumulado.

## Fora do escopo da v1

Carrossel visual de compras com foto e botão de comprar: não há forma de ler isso por API — depende do lojista enviar catálogo ao protocolo de comércio da OpenAI. Fica para v2, e é caro.

## O que não muda

`pricing-rules.ts`, `simulate-ai`, o cálculo dos 5 pilares, as regras de plano e cobrança, e o intervalo de 30 dias entre análises.
