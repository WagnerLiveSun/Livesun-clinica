# Validação de layout — Contas a receber

## Cenários verificados

| Largura do viewport | Estrutura resultante | Resultado |
| --- | --- | --- |
| 1398 px, com o cartão de Despesas recentes ao lado | Três filtros na primeira linha e dois na segunda | Nenhum campo é cortado ou ultrapassa o cartão financeiro. |
| 905 px, com o painel financeiro em uma coluna | Dois filtros por linha e o quinto em linha própria | Todos os rótulos e controles permanecem inteiramente visíveis. |

As verificações foram renderizadas localmente com a mesma estrutura de grade do painel, após a adoção de duas colunas a partir de 560 px e três colunas somente a partir de 1360 px.
