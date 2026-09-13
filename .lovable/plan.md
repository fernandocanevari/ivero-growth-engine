# Vitrine IA v1 — plano

Um novo módulo do painel que responde: **quando alguém pergunta a uma IA onde comprar o que a sua marca vende, quais lojas e páginas a IA cita — e com que frequência a sua marca aparece.**

Não é uma foto de uma consulta. É um acumulado ao longo do tempo: "a Netshoes apareceu em 8 de 10 consultas; a sua marca, em 2 de 10".

## Princípio inegociável

O cálculo dos 5 pilares (Diagnóstico / Visibilidade IA) **não é tocado**. Nenhuma busca na web entra no motor oficial de score, que continua em `temperature 0` para manter os números estáveis. A Vitrine IA é um caminho separado, com função própria, tabelas próprias e página própria.

## Como funciona

1. O cliente cadastra até 10 **perguntas de compra** ("melhor tênis para maratona", "onde comprar tênis de corrida barato"). Sugerimos as primeiras a partir do setor e das palavras-chave que já temos da marca.
2. Uma rotina roda essas perguntas periodicamente (semanal por padrão) nos três motores.
3. De cada resposta guardamos: a loja/domínio citado, o nome do produto quando vier, o link quando vier, e se a marca do cliente foi mencionada.
4. A página mostra o ranking de lojas por taxa de aparição, a posição da marca do cliente nesse ranking, e a evolução dessa taxa semana a semana.

### Motores

| Motor | Papel | Observado no teste |
| --- | --- | --- |
| Claude (com busca) | principal | respostas quase idênticas entre rodadas; custo previsível (~US$ 0,04/consulta) |
| Google Modo IA | complemento | busca já ativa; o mais barato; link mascarado, mas o domínio é identificável |
| ChatGPT (com busca) | complemento | é o único que devolve link direto de página de produto, porém varia muito entre rodadas |

Cada consulta roda nos três; o resultado é sempre apresentado por motor, nunca somado num número único.

### Região e idioma

Obrigatório em toda consulta: Brasil e português. Sem isso, o teste trouxe lojas da Turquia, Japão e Malásia. Aplicado de três formas ao mesmo tempo: instrução explícita no prompt, parâmetro de localização/idioma na busca de cada provedor, e descarte de domínios fora de uma lista de países aceitos. Marcas com atuação regional (cidade/estado, dado que já temos) recebem esse recorte no texto da pergunta.

## Público

Além das marcas atuais, o módulo abre o produto para e-commerce e varejo: para eles, esta é a pergunta central.

## Banco de dados

Três tabelas novas, no mesmo padrão de `analysis_history` (registro imutável por rodada, dono por `user_id`, acesso só do próprio dono).

**`vitrine_queries`** — as perguntas de compra do cliente
`user_id`, `pergunta`, `pais` (padrão BR), `idioma` (padrão pt-BR), `regiao` (opcional), `ativo`, `frequencia` (semanal/mensal), `next_run_at`, `last_run_at`, timestamps.

**`vitrine_runs`** — uma linha por pergunta × motor × rodada
`user_id`, `query_id`, `engine` (`chatgpt` | `google_ai` | `claude`), `status` (`ok` | `erro`), `resposta_texto`, `dominios` (jsonb), `marca_citada` (bool), `custo_usd`, `duracao_ms`, `erro_msg`, `executado_em`, `created_at`. Imutável: só criação e leitura.

**`vitrine_citations`** — uma linha por loja/página citada dentro de uma rodada
`user_id`, `run_id`, `query_id`, `engine`, `dominio`, `loja_nome`, `produto_nome`, `preco_texto`, `url`, `url_mascarada` (bool), `tipo_fonte` (`loja` | `marketplace` | `review` | `outro`), `is_marca_do_cliente` (bool), `posicao`, `created_at`.

A frequência de citação é calculada por leitura: citações distintas por domínio ÷ rodadas do período. Sem número mágico gravado.

Enum novo para os motores; acesso liberado apenas para o usuário autenticado dono da linha, e para as funções de servidor que gravam as rodadas.

## Implementação

- Nova função de servidor `vitrine-run` — executa uma pergunta nos três motores com busca ativada, normaliza domínios (remove `www`, resolve redirecionador do Google, guarda `utm_source=openai` como veio), classifica o tipo de fonte, marca a própria marca do cliente e grava rodada + citações. Independente de `simulate-ai`, que fica intacta.
- Nova função agendada `vitrine-schedule` — dispara as perguntas vencidas (`next_run_at`), com teto de consultas por conta e por dia.
- Nova página `/dashboard/vitrine` — ranking de lojas com taxa de aparição, posição da marca, gráfico de evolução da taxa, lista das citações mais recentes com link quando houver, e aviso claro quando houver menos de 3 rodadas ("ainda coletando: a frequência só é confiável a partir de X rodadas").
- Item novo no menu, com selo beta. Gating por plano seguindo as regras atuais, sem alterá-las.

## Custo

Por consulta: Claude ~US$ 0,04, ChatGPT ~US$ 0,01–0,03, Google praticamente zero. Com 10 perguntas × 3 motores × 4 semanas = 120 consultas/mês por marca → **cerca de US$ 3 a 6 por marca/mês**. Cotas por plano evitam surpresa.

## Fora do escopo da v1

Carrossel visual de compras com foto e botão de comprar: não existe forma de ler isso por API — depende do lojista enviar catálogo ao protocolo de comércio da OpenAI. Fica como v2, e é caro.

## O que não muda

`pricing-rules.ts`, `simulate-ai`, o cálculo dos 5 pilares, as regras de plano e cobrança, e o intervalo de 30 dias entre análises.
