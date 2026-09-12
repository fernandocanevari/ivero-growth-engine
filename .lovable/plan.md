# Melhorar a leitura do gráfico de Evolução

## Confirmação — diagnóstico 52 do Cliente 58

O terceiro diagnóstico não foi criado por uma query de investigação nem pelo backfill posterior.

- Em `audit_reports`, o score 52 foi gravado em 08/09 às 22:29:23 com `source = reanalise`.
- Em `analysis_history`, os mesmos seis valores foram gravados um segundo depois, às 22:29:24, também com `source = reanalise`.
- Os cinco pilares coincidem exatamente nas duas tabelas: Clareza 53, Autoridade 50, Conversão 48, Posicionamento 55 e Relevância 53.
- Esse par corresponde ao fluxo normal de nova análise no painel, que persiste nas duas tabelas. A investigação de 09/09 apenas consultou esses registros para explicar por que a tela mostrava 79 enquanto o resultado persistido da conta era 52.
- O backfill de 12/09 somente copiou relatórios antigos de `source = preview` para a série histórica; ele não criou nem alterou esse diagnóstico.

Nenhum dado será alterado por esta confirmação.

## Ajuste visual

1. Calcular o menor e o maior valor reais entre as seis séries visíveis do gráfico.
2. Aplicar um domínio dinâmico ao eixo vertical, com margem acima e abaixo dos valores, limitado ao intervalo válido de 0 a 100.
3. Garantir uma amplitude mínima para que séries muito próximas não produzam uma escala excessivamente apertada ou instável.
4. Aumentar moderadamente a altura do gráfico principal, preservando a disposição atual da legenda e dos cards de variação.
5. Recalcular a escala quando uma série for ocultada ou reexibida pela legenda, usando apenas as linhas visíveis.
6. Manter intactos os dados, scores, histórico, cooldown, regras de plano e gráficos individuais dos cards.

## Verificação

- Conferir o gráfico com os três pontos do Cliente 58 e validar que as seis linhas ficam visualmente mais separadas.
- Ocultar e reexibir séries pela legenda e confirmar que a escala se adapta sem cortar pontos.
- Verificar o estado com uma única análise e os limites próximos de 0 e 100.
- Rodar a checagem de tipos e os testes relacionados à página Visibilidade IA.

## Detalhes técnicos

- Alteração restrita ao gráfico principal “Tendência dos pilares ao longo do tempo” em `PilaresPage`.
- O eixo atual está fixo em `[0, 100]` e o contêiner usa altura 320px; esses são os dois pontos visuais a ajustar.
- A margem dinâmica terá limite de 0–100 e amplitude mínima previsível para evitar saltos exagerados.
