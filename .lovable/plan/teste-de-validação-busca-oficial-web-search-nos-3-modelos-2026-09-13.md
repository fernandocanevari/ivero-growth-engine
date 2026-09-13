# Teste de validação — busca oficial (web_search) nos 3 modelos

Objetivo: medir, com chamadas reais, se a busca oficial dos provedores entrega **link de loja/página real**, com **estabilidade suficiente** para virar produto, e a **que custo**. Nenhuma linha do produto é alterada.

## Garantias de preservação

- O cálculo dos 5 pilares e o modo `temperature 0` do diagnóstico não são tocados.
- Os testes rodam em scripts descartáveis fora do projeto (pasta temporária), chamando as APIs direto com as chaves já existentes. Nada é gravado no banco, nenhuma função é publicada, `simulate-ai` não é editado.

## O que será medido

1. **Consistência** — a mesma pergunta de compra em português (ex.: "melhor tênis de corrida para maratona até R$ 900, onde comprar no Brasil") rodada 3 vezes em cada provedor, com intervalo de alguns minutos. Para cada rodada registro: domínios citados, lojas citadas, produtos nomeados, preços. Depois calculo a sobreposição entre rodadas (quantos domínios aparecem em 3/3, 2/3, 1/3).
2. **Link real vs. menção genérica** — para cada citação retornada, verifico se existe URL, se o domínio é loja ou conteúdo editorial, e se a URL abre (checagem de status HTTP).
3. **Custo real por consulta** — leitura do uso de tokens devolvido em cada resposta + a tarifa de busca de cada provedor, convertido em custo por consulta e projetado para ~480 consultas/marca/mês.
4. **Modelos OpenAI que aceitam `web_search`** — testo na prática uma lista curta de candidatos e registro quais respondem e quais retornam erro; a resposta vem do teste, não da documentação.

## Protocolo por provedor

- **ChatGPT (OpenAI)** — API Responses com a ferramenta de busca ativada; registro anotações/citações de URL da resposta.
- **Claude (Anthropic)** — Messages API com a ferramenta de busca ativada; registro citações e o contador de buscas usado para o custo.
- **Google Modo IA** — mesma configuração de grounding que já usamos hoje, para servir de linha de base comparável.

## Entregável

Um relatório com: tabela de estabilidade por provedor (domínios em 3/3, 2/3, 1/3), exemplos reais de link de loja retornado, custo medido por consulta e por marca/mês, lista confirmada de modelos OpenAI com busca, e uma recomendação explícita entre Vitrine IA v1 (citação de loja/página com recursos oficiais) e avançar também para v2 (carrossel visual via fornecedor externo).

## Fora de escopo

- Nenhuma alteração em `simulate-ai`, scores, planos, cobrança ou banco.
- Nenhuma tela nova. O desenho da funcionalidade só entra depois, se o teste mostrar viabilidade.
