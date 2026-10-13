# Previsão Orçamentária — Tá na Mão

## Objetivo

Adicionar, dentro de **Edificações → Painel do Condomínio**, a área **Previsão Orçamentária**, para comparar o orçamento aprovado em assembleia com as despesas realmente lançadas no financeiro do mesmo condomínio.

## Princípios

- Reutilizar os lançamentos já existentes em `ContaSindico`; não exigir que a síndica cadastre a mesma despesa duas vezes.
- Isolar todos os dados por `condominioId`, seguindo o escopo multi-condomínio existente.
- Preservar o orçamento aprovado originalmente e manter histórico de revisões.
- Distinguir valor orçado, despesa lançada, valor pago e compromissos em aberto. O total pago não deve ser confundido com o total realizado.
- Não declarar uma revisão como aprovada em assembleia sem registrar a ata/referência e a data correspondente.
- Restringir criação e edição a usuários autorizados (ADMIN/SINDICO); moradores só visualizam eventual relatório que seja explicitamente publicado.

## Fluxo proposto

1. Criar um exercício orçamentário com nome/período (ex.: janeiro a dezembro), data da assembleia, referência da ata, total aprovado e observações.
2. Cadastrar categorias e o valor aprovado por mês ou por ano para cada categoria.
3. Vincular categorias do orçamento às categorias de despesa existentes no financeiro. Quando necessário, permitir uma correspondência configurável para que os relatórios não misturem categorias diferentes.
4. Alimentar o realizado com lançamentos de `ContaSindico` por competência (mês/ano), categoria e condomínio, evitando duplicação manual.
5. Exibir comparativo mensal e acumulado do exercício, com filtros por mês, categoria e status.
6. Permitir registrar justificativas para desvios e anexar referência documental quando aplicável.
7. Exportar relatório de prestação de contas com orçamento aprovado, realizado, diferença nominal e percentual, compromissos em aberto e notas explicativas.

## Indicadores

- **Orçado:** valor aprovado para a categoria/período.
- **Realizado:** despesas atribuídas à competência do período, independentemente de já terem sido pagas.
- **Pago:** soma dos lançamentos com status `PAGO` e data de pagamento/competência aplicável.
- **Em aberto:** compromissos a pagar, agendados ou vencidos.
- **Desvio (R$):** realizado menos orçado.
- **Desvio (%):** (realizado - orçado) / orçado × 100; quando o orçamento for zero, mostrar “sem previsão” em vez de dividir por zero.
- **Projeção de fechamento:** estimativa separada e identificada como projeção, nunca como valor realizado.

## Regras de cálculo e transparência

- A competência mensal deve ser a base principal de comparação, não apenas a data de pagamento.
- Despesas extraordinárias devem continuar visíveis e ser identificadas; não devem ser silenciosamente removidas do comparativo.
- Reclassificações e revisões de orçamento devem manter trilha de auditoria.
- Valores monetários devem ser armazenados com precisão decimal no banco (preferencialmente `Decimal`, em vez de ponto flutuante) na nova estrutura.
- Evitar duplicidade de despesa: cada lançamento existente entra uma única vez no realizado.
- Mostrar aviso quando existirem despesas sem categoria correspondente ao orçamento.

## Entrega técnica em etapas

1. **Banco de dados:** modelos para exercício orçamentário, linhas/categorias orçadas, revisões e histórico; migração Prisma.
2. **API:** endpoints autenticados para consultar/criar exercícios, gerir linhas orçadas, registar justificativas e obter comparativos por competência; validar acesso ao condomínio em cada rota.
3. **Integração financeira:** usar `ContaSindico` como origem do realizado e documentar a regra de competência/categoria.
4. **Interface:** tela responsiva com cards de indicadores, tabela por categoria, comparativo mensal, filtros e formulário para cadastro do orçamento aprovado.
5. **Relatório e testes:** exportação e testes para isolamento entre condomínios, cálculo de desvios, orçamento zero, revisões e lançamentos em aberto.

## Critérios de aceite

- Um síndico consegue registrar o orçamento aprovado e a referência da assembleia.
- O realizado é calculado a partir das despesas já existentes no financeiro, sem lançamentos duplicados.
- O comparativo pode ser consultado por mês, categoria e acumulado do exercício.
- O sistema mostra desvios positivos e negativos corretamente, inclusive quando a previsão é zero.
- Usuários de uma edificação não conseguem consultar nem alterar os dados de outra.
- O orçamento original e as revisões ficam auditáveis.
- O relatório diferencia despesas realizadas, pagas e em aberto.

## Nota de implementação

Antes de alterar o schema, conferir o estado atual das rotas, componentes de interface e convenções de testes do repositório. Implementar em etapas pequenas, validar a migração Prisma e manter esta funcionalidade em branch própria até revisão.
