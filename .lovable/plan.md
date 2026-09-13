# Estudo de viabilidade — captura da Vitrine IA (carrossel de compras)

Objetivo: descobrir se é possível capturar, de forma confiável e repetível, o carrossel de produtos que ChatGPT/Gemini mostram em respostas de compra — foto, preço, nome da loja e link de saída. Nenhuma linha do produto atual é alterada neste estudo.

## Ponto de partida (já confirmado)

- Toda a captura de IA hoje passa por uma única função: `simulate-ai`, com 4 modelos (ChatGPT, Gemini, Google Modo IA com busca, Claude).
- Essas APIs devolvem **texto**. O carrossel de compras é um recurso da interface web, não da API — nenhuma delas o retorna.
- Não existe hoje nenhuma detecção de produto, preço, loja ou link de saída no sistema, nem tabela que guarde respostas por pergunta.
- Conclusão de partida: capturar a vitrine exige uma **fonte de dados nova**, não um ajuste no motor atual.

## O que o estudo vai responder

1. Existe caminho oficial? Verificar se OpenAI, Google e Perplexity oferecem hoje algum acesso programático a resultados de compra (feed de produtos, API de shopping, programa de merchant, dados estruturados de citação comercial) e sob quais termos de uso.
2. Se não houver caminho oficial: um navegador automatizado consegue abrir a pergunta na interface web, esperar o carrossel renderizar e ler foto, preço, loja e link? Testar em duas ou três perguntas reais de compra em português.
3. Qual a estabilidade real: o mesmo produto aparece se a pergunta for repetida? Muda por região, por conta logada, por horário?
4. Quais bloqueios aparecem: login obrigatório, verificação anti-robô, limite de requisições, custo por consulta.
5. Qual o custo estimado por marca monitorada por mês, nos dois caminhos.
6. Quais riscos de termos de uso e de manutenção (a interface muda e a leitura quebra).

## Como será executado

- Etapa 1 — pesquisa das fontes oficiais e dos termos de uso de cada provedor (pesquisa na web, sem tocar no código).
- Etapa 2 — teste prático isolado: scripts descartáveis de navegador automatizado, fora do projeto (em pasta temporária), apenas para provar ou descartar a leitura do carrossel. Nada é adicionado ao aplicativo.
- Etapa 3 — repetir a mesma pergunta em momentos e regiões diferentes para medir estabilidade.
- Etapa 4 — relatório final com: viabilidade (sim/não/parcial) por provedor, custo estimado, riscos e o formato de dado que seria possível capturar (que serve de base para o desenho das tabelas, num próximo passo).

## Fora de escopo

- Nenhuma alteração em `simulate-ai`, nos scores, nas regras de plano ou de cobrança.
- Nenhuma migração de banco, nenhuma tela nova, nenhuma função nova publicada.
- O desenho da funcionalidade (tabelas, telas, planos, preço) só entra depois, num plano separado, e apenas se o estudo mostrar viabilidade.

## Entregável

Um relatório escrito, com evidências dos testes (capturas de tela e amostras dos dados lidos), recomendando seguir, seguir com ressalvas, ou não seguir.
