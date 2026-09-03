# Modelo de dados

PostgreSQL 16, acessado via Prisma 7 (driver adapter `@prisma/adapter-pg`).
O schema completo está em `prisma/schema.prisma`; este documento explica o
raciocínio por trás das decisões de modelagem, não repete o schema campo a
campo.

## Diagrama de relacionamento (simplificado)

```
Usuario ──┐
          │ (criadoPor, publicadoPor)
Sindico ──┤
          ▼
     Condominio ──┬── Unidade ── Morador
                   ├── LancamentoFinanceiro ── CategoriaFinanceira
                   │         │                  Fornecedor
                   │         └── PrestacaoContasItem
                   ├── TituloFinanceiro
                   ├── PrestacaoContas ── PrestacaoContasItem
                   ├── MovimentoFundoReserva
                   ├── Documento
                   └── Contrato

LogAuditoria ── Usuario (opcional)
TokenRecuperacaoSenha ── Usuario
```

## Por que separar `LancamentoFinanceiro` de `PrestacaoContas`

Esta é a decisão de modelagem mais importante do projeto, porque resolve um
problema real das planilhas originais.

**Nas planilhas fornecidas**, a lista de "receitas" do mês misturava duas
naturezas diferentes de valor: o saldo que sobrou do mês anterior e as
receitas de fato arrecadadas naquele mês (taxas condominiais, por exemplo).
Isso funciona para uma leitura pontual, mas quebra a cada mês seguinte —
sem querer, o saldo herdado vira "receita nova" na soma, inflando o total
arrecadado de forma que não reflete a realidade contábil.

**O novo modelo separa três conceitos:**

1. `LancamentoFinanceiro` — cada entrada ou saída de dinheiro individual,
   com categoria, tipo (receita/despesa), data e competência. É o dado
   granular e é ele que existe independente de qualquer prestação de
   contas — pode ser lançado a qualquer momento.
2. `PrestacaoContas.saldoAnterior` — um campo próprio, não um lançamento.
   Representa o saldo em caixa ao final do mês anterior, herdado
   automaticamente do `saldoAtual` da prestação anterior (ou editável
   manualmente quando não há prestação anterior publicada).
3. `PrestacaoContas.totalReceitas` / `totalDespesas` / `saldoAtual` — valores
   calculados a partir da soma dos lançamentos do mês, nunca digitados à
   mão.

A fórmula é simplesmente `saldoAtual = saldoAnterior + totalReceitas - totalDespesas`,
e cada termo tem uma fonte de dado única e auditável.

**Verificação de que a migração preserva os números originais:** o script
de seed (`prisma/seed.ts`) reconstrói os lançamentos de junho/2026 dos dois
condomínios a partir das planilhas fornecidas e recalcula o saldo pela
fórmula acima — com asserts que travam a execução se o resultado não bater
exatamente com o saldo que já constava nas planilhas (Barcelia: -R$182,68;
Montreal: R$1.238,22). Ou seja: a reorganização não muda nenhum valor
financeiro, só a forma como ele é registrado e onde cada número mora.

## Por que `PrestacaoContasItem` (padrão de snapshot/congelamento)

Quando uma prestação de contas é gerada, cada `LancamentoFinanceiro`
daquele condomínio/competência é copiado para uma linha em
`PrestacaoContasItem`, com o valor considerado naquele momento
(`valorConsiderado`).

Sem essa tabela intermediária, a prestação de contas seria só "os
lançamentos que batem com esse condomínio+mês" — uma consulta dinâmica. O
problema: se alguém editar um lançamento *depois* que a prestação já foi
publicada e entregue ao síndico, o PDF que o síndico recebeu ficaria
dessincronizado do que o sistema mostra hoje. Isso é inaceitável para um
documento financeiro oficial.

Com o snapshot: a prestação publicada é imutável por construção. Só uma
ação explícita e auditada (recalcular em rascunho, ou reabrir uma
publicada) atualiza os itens.

## Enums centrais

| Enum | Valores | Uso |
|---|---|---|
| `PapelUsuario` | `OPERACIONAL`, `GESTOR`, `ADMIN` | hierarquia de permissão |
| `StatusPrestacaoContas` | `RASCUNHO`, `EM_REVISAO`, `PUBLICADA` | fluxo de aprovação da prestação |
| `TipoLancamento` | `RECEITA`, `DESPESA` | natureza do lançamento |
| `TipoTitulo` | `PAGAR`, `RECEBER` | contas a pagar/receber |
| `StatusTitulo` | `PENDENTE`, `PAGO`, `ATRASADO`, `CANCELADO` | ciclo de vida do título |
| `NaturezaLancamento` | `FIXA`, `EXTRA`, `BANCARIA`, `REPASSE` | classificação da categoria financeira |
| `AcaoAuditoria` | `CRIACAO`, `ATUALIZACAO`, `EXCLUSAO`, `PUBLICACAO`, `LOGIN`, `LOGIN_FALHOU` | tipo de evento auditado |

## Índices relevantes

- `LancamentoFinanceiro`: índice composto em `(condominioId, competenciaAno, competenciaMes)` —
  é a consulta mais frequente do sistema (toda tela financeira filtra por
  condomínio+competência).
- `PrestacaoContas`: chave única composta `(condominioId, competenciaMes, competenciaAno)` —
  impede fisicamente a criação de duas prestações para o mesmo
  condomínio/mês, sem depender de checagem na aplicação.
- `LogAuditoria`: índice em `(entidade, entidadeId)` — permite consultar
  rapidamente "todo o histórico deste registro específico", útil para
  investigação de uma alteração pontual.

## Soft delete

Todas as entidades operacionais (`Condominio`, `Unidade`, `Morador`,
`Fornecedor`, `LancamentoFinanceiro`, `TituloFinanceiro`) têm campo
`excluidoEm: DateTime?`. Toda consulta de listagem filtra
`where: { excluidoEm: null }`. Isso permite:

- Recuperar um registro apagado por engano (basta um `UPDATE` limpando o
  campo — não requer restaurar backup).
- Manter a integridade referencial de lançamentos antigos que referenciam
  um fornecedor ou categoria que depois foi desativado.

`PrestacaoContas` **não** tem soft delete — ver `ARCHITECTURE.md`, seção
"Padrão de proteção de dados".

## Precisão monetária

Todo valor financeiro usa `Decimal @db.Decimal(12, 2)`, nunca `Float`. Isso
evita os erros de arredondamento clássicos de ponto flutuante binário em
somas repetidas de centavos — importante em um sistema cujo propósito é
justamente bater centavo a centavo com o que o síndico confere manualmente.

O tipo `Decimal` do Prisma não é serializável para Client Components — toda
tela chama `.toString()` no valor antes de repassá-lo para um componente de
formulário, e o cálculo de somas/médias é sempre feito com `Number(valor)`
no servidor antes de enviar já como `number` puro para o cliente.
