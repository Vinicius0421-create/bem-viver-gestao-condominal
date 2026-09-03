# Arquitetura

## Visão geral

O sistema é uma aplicação Next.js única (não há backend separado). A
interface é renderizada no servidor por padrão (React Server Components);
interatividade (formulários, diálogos, gráficos) usa Client Components
pontuais. Toda escrita no banco passa por **Server Actions** — funções
assíncronas marcadas com `"use server"` que rodam exclusivamente no
servidor e são chamadas diretamente pelo formulário/botão do cliente, sem
precisar definir uma rota de API para cada operação.

```
Navegador
   │  Server Actions (mutações) / RSC (leitura)
   ▼
Next.js (App Router, Turbopack)
   │  Prisma Client (driver adapter @prisma/adapter-pg)
   ▼
PostgreSQL
```

As duas exceções que usam Route Handlers tradicionais (`app/api/.../route.ts`)
são a exportação de PDF e Excel da prestação de contas — porque precisam
devolver um arquivo binário com `Content-Type`/`Content-Disposition`
específicos, algo que uma Server Action não faz de forma nativa.

## Estrutura de pastas

```
src/
├── app/
│   ├── (login)/login/          páginas públicas
│   ├── dashboard/               área autenticada (layout com sidebar)
│   │   ├── condominios/
│   │   ├── sindicos/
│   │   ├── fornecedores/
│   │   ├── financeiro/
│   │   │   ├── lancamentos/
│   │   │   ├── titulos/
│   │   │   └── fluxo-de-caixa/
│   │   ├── prestacao-de-contas/
│   │   │   └── [id]/
│   │   ├── auditoria/
│   │   └── configuracoes/
│   ├── actions/                  Server Actions, uma por domínio
│   └── api/prestacoes/[id]/      exportação PDF/Excel (Route Handlers)
├── components/
│   ├── ui/                       primitivos (Button, Dialog, Table, ...)
│   ├── shared/                   componentes reutilizados entre domínios
│   └── <domínio>/                componentes específicos de cada módulo
├── hooks/                        hooks compartilhados (ex: use-dialog-action)
├── lib/
│   ├── prisma.ts                 singleton do Prisma Client
│   ├── session.ts                emissão/verificação de sessão (JWT)
│   ├── password.ts                hashing de senha (bcrypt)
│   ├── dal.ts                    Data Access Layer — verifySession/requireRole
│   ├── audit.ts                  registrarAuditoria()
│   ├── utils.ts                  formatação (moeda, data, competência)
│   ├── validations/              schemas Zod, um por domínio
│   ├── pdf/                      documento React-PDF da prestação de contas
│   └── excel/                    geração de planilha (exceljs)
├── generated/prisma/             client Prisma gerado (não editar)
└── proxy.ts                      proteção de rotas (equivalente ao antigo middleware.ts)
```

## Autenticação e autorização

- **Sessão:** JWT assinado (HS256, biblioteca `jose`) guardado em cookie
  `httpOnly`, `secure` em produção, expiração de 8 horas. Payload contém
  `userId`, `nome`, `email`, `papel`.
- **Senha:** hash com `bcryptjs` (10 rounds). O hash nunca é enviado ao
  cliente — toda consulta que alimenta um componente de UI usa `select`
  explícito no Prisma, nunca `findMany()` sem seleção de campos quando o
  resultado alimenta um Client Component.
- **Perfis (`PapelUsuario`):** `OPERACIONAL` (1) < `GESTOR` (2) < `ADMIN` (3).
  A hierarquia é numérica — checar "nível mínimo" é uma comparação `>=`, não
  uma lista de perfis permitidos, o que evita esquecer de atualizar uma
  checagem quando um novo perfil é inserido no meio da hierarquia.
- **Onde a autorização é verificada, em camadas:**
  1. `src/proxy.ts` — bloqueia acesso a `/dashboard/*` sem cookie de sessão
     (proteção de navegação, primeira linha de defesa).
  2. `verifySession()` / `requireRole()` (`src/lib/dal.ts`) — chamado no
     topo de toda página e toda Server Action que precisa de autenticação.
     Esta é a verificação que **realmente importa**: a do proxy é UX
     (evita reenviar HTML de página protegida), a do `requireRole` é a que
     impede a ação de fato.
  3. A UI (menus, botões) esconde ações que o usuário não pode realizar,
     mas isso é conveniência — nunca é a única barreira.

## Padrão de Server Actions

Toda action de escrita segue o mesmo formato:

```ts
export async function salvarX(prevState, formData) {
  const session = await requireRole("OPERACIONAL");   // 1. autorização
  const parsed = XSchema.safeParse(...);               // 2. validação (Zod)
  if (!parsed.success) return { success: false, error: ... };
  // 3. mutação no banco (Prisma)
  await registrarAuditoria({ ... });                   // 4. auditoria (best-effort)
  revalidatePath(...);                                  // 5. invalidação de cache
  return { success: true };
}
```

Ações que fazem mais de uma escrita relacionada (ex: dar baixa em um título
E criar o lançamento financeiro correspondente) usam `prisma.$transaction`
para garantir atomicidade — nunca fica um título baixado sem o lançamento
correspondente, ou vice-versa.

## Por que não `useActionState` + `useEffect` para fechar diálogos

Um padrão comum em apps com Server Actions é usar `useActionState` para
capturar o resultado do formulário e um `useEffect` para fechar o diálogo
quando `state.success` é verdadeiro. Neste projeto, o **React Compiler**
(habilitado via `eslint-plugin-react-hooks` na configuração padrão do
Next.js 16) proíbe chamadas de `setState` dentro de efeitos — mesmo quando
guardadas por uma condição — porque esse padrão tende a gerar
re-renderizações em cascata.

A alternativa adotada (`src/hooks/use-dialog-action.ts`) chama a Server
Action a partir de um manipulador assíncrono acionado pelo próprio envio do
formulário (`<form action={submit}>`, onde `submit` é uma função local, não
a Server Action diretamente) e reage ao resultado no mesmo instante — sem
efeito algum. Isso também é mais simples de acompanhar: o diálogo fecha
exatamente quando sabemos que a ação teve sucesso, não em um ciclo de
renderização posterior.

## Regra de serialização Server → Client

Um Server Component só pode passar para um Client Component dados que sejam
serializáveis: objetos simples, arrays, strings, números, booleanos, `Date`,
e elementos React já renderizados. **Não pode passar:** instâncias de
`Decimal` (tipo usado pelo Prisma para colunas monetárias), funções, nem
referências de componente não invocadas.

Duas armadilhas comuns que este projeto evita deliberadamente:

1. **Nunca fazer spread de um registro do Prisma direto em uma prop de
   Client Component.** `<FormDialog registro={{ ...r, campo: r.campo.toString() }} />`
   parece seguro porque converte o campo Decimal problemático, mas se `r`
   veio de uma query com `include` de alguma relação, o objeto espalhado
   carrega essa relação inteira (que pode ter seus próprios campos
   `Decimal`). O padrão usado aqui é sempre reconstruir o objeto campo a
   campo: `{ id: r.id, nome: r.nome, valor: r.valor.toString(), ... }`.
2. **Nunca passar uma referência de componente (ex: `icon={MeuIcone}`) de
   um Server Component para um Client Component.** Funciona em tempo de
   compilação (TypeScript não reclama), mas quebra em runtime, porque
   funções não são serializáveis. A correção é sempre passar o elemento já
   renderizado: `icon={<MeuIcone className="h-4 w-4" />}`.

Ambas as armadilhas já existiam em código anterior deste projeto e foram
corrigidas durante a validação end-to-end (ver `ROADMAP.md`, seção
"Correções aplicadas nesta fase").

## Padrão de proteção de dados

- **Soft delete** (`excluidoEm: DateTime?`) em todas as entidades
  operacionais (condomínios, lançamentos, títulos, fornecedores, síndicos,
  categorias, unidades, moradores) — nada é apagado fisicamente por engano;
  o registro só some das listagens (`where: { excluidoEm: null }`).
- **Prestação de contas não usa soft delete** — uma vez que sai do estado
  `RASCUNHO`, ela não pode mais ser excluída, apenas reaberta por um ADMIN
  com motivo obrigatório registrado em auditoria. Isso é proposital: um
  demonstrativo já enviado a um síndico precisa de rastro permanente, não
  de "exclusão suave".
- **Snapshot/freeze na prestação de contas.** Ao gerar (ou recalcular) uma
  prestação, cada lançamento considerado é copiado para
  `PrestacaoContasItem` com o valor daquele momento (`valorConsiderado`).
  Se um lançamento for editado depois, a prestação já publicada não muda —
  só uma recalculagem explícita (permitida apenas em rascunho) atualiza os
  itens. Isso preserva a integridade do documento oficial entregue ao
  síndico.
- **Auditoria best-effort.** `registrarAuditoria()` nunca lança exceção que
  derruba a operação principal — se o log falhar, a ação de negócio ainda
  é concluída (o log não é fonte de verdade transacional, é rastreabilidade
  adicional).

## Testes realizados nesta fase

Não há suíte de testes automatizados (unitários/integração) — ver
`ROADMAP.md`. A validação desta fase foi feita com:

1. `tsc --noEmit` — zero erros de tipo.
2. `next lint` — zero erros/warnings (inclui as regras do React Compiler).
3. `next build` — build de produção completo, todas as 16 rotas geradas.
4. Testes end-to-end com Playwright (`scripts/smoke-test*.mjs`) cobrindo:
   login, navegação por todas as páginas, abertura de todos os diálogos de
   edição (onde os dois bugs de serialização foram encontrados e
   corrigidos), e o fluxo completo da prestação de contas — geração →
   exportação PDF/Excel → envio para revisão → publicação → reabertura.

Os scripts de smoke test ficam em `scripts/` e podem ser reexecutados a
qualquer momento com o servidor de desenvolvimento rodando:
`node scripts/smoke-test.mjs` (requer o pacote `playwright`).
