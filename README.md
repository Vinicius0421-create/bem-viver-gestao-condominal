# Bem Viver — Sistema de Prestação de Contas Condominial

Sistema web interno da Bem Viver Assessoria Condominial para gestão financeira,
prestação de contas e operação diária dos condomínios administrados pela empresa.

Substitui o processo manual em planilhas por um sistema com banco de dados
normalizado, controle de acesso por perfil, trilha de auditoria e um fluxo de
aprovação estruturado para o produto mais importante entregue aos síndicos: a
prestação de contas mensal.

## Stack técnica

| Camada | Tecnologia | Observação |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Server Components + Server Actions, sem API REST separada |
| Linguagem | TypeScript 5 | modo estrito |
| UI | React 19, Tailwind CSS v4, Radix UI | componentes próprios (não usa shadcn CLI) |
| Banco de dados | PostgreSQL 16 | normalizado, com soft-delete e trilha de auditoria |
| ORM | Prisma 7 (driver adapters) | `@prisma/adapter-pg`, sem engine binário nativo |
| Autenticação | JWT próprio (`jose`) + `bcryptjs` | cookies `httpOnly`, sem dependência de provedor externo |
| Gráficos | Recharts | dashboard executivo e fluxo de caixa |
| PDF | `@react-pdf/renderer` | prestação de contas com identidade visual preto/dourado |
| Excel | `exceljs` | exportação formatada da prestação de contas |
| Hospedagem | Railway (app + PostgreSQL gerenciado) | em produção, ver `DEPLOY.md` |

## Acesso em produção

**URL:** https://bemviver-app-production.up.railway.app

Login inicial (troque a senha no primeiro acesso — ver `DEPLOY.md`):
- E-mail: `bemviverassessoria.cond@gmail.com`
- Senha provisória: `BemViver@2026`

## Por que esta stack (e não outra)

O pedido original citava "banco de dados" e "hospedagem" em aberto. A decisão
por **Next.js + Postgres gerenciado**, em vez de, por exemplo, uma
stack com backend separado (Node/Express + React), foi tomada por três
motivos concretos:

1. **Custo baixo e previsível.** O plano avaliado inicialmente (Vercel +
   Supabase, camada gratuita) foi trocado por Railway (~US$ 5/mês) porque
   a conta já existia e permitiu publicar projeto + banco + aplicação em
   uma única plataforma, via CLI, sem exigir configuração manual em dois
   painéis distintos — ver `DEPLOY.md` para o raciocínio completo dessa
   troca.
2. **Um único deploy, um único repositório.** Server Actions eliminam a
   necessidade de manter uma API REST/GraphQL separada — menos superfície de
   erro, menos infraestrutura para a Bem Viver manter sem um time de TI
   dedicado.
3. **Autenticação própria em vez de NextAuth/Auth.js.** Na data em que este
   projeto foi construído, o Next.js estava na versão 16 (lançamento muito
   recente, com mudanças de roteamento — `middleware.ts` virou `proxy.ts`).
   Bibliotecas de terceiros que dependem de convenções internas do Next
   frequentemente ficam incompatíveis por algumas semanas após um major
   release. Implementar sessão via JWT assinado + cookie `httpOnly` é ~150
   linhas de código auditável (`src/lib/session.ts`, `src/lib/password.ts`,
   `src/lib/dal.ts`) e remove esse risco por completo.

## Rodando localmente

Pré-requisitos: Node.js 20+, PostgreSQL 16 rodando localmente (ou uma
`DATABASE_URL` de um Postgres gerenciado).

```bash
npm install
cp .env.example .env        # preencha DATABASE_URL e SESSION_SECRET
npm run db:migrate          # cria as tabelas
npm run db:seed             # popula dados iniciais (usuário admin, categorias, etc.)
npm run dev                 # http://localhost:3000
```

Login inicial criado pelo seed:

- **E-mail:** `bemviverassessoria.cond@gmail.com`
- **Senha provisória:** `BemViver@2026` (troque no primeiro acesso em produção)

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Ambiente de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção — roda type-check e lint |
| `npm run start` | Serve o build de produção |
| `npm run lint` | ESLint (inclui regras do React Compiler) |
| `npm run db:migrate` | Aplica migrations em desenvolvimento (`prisma migrate dev`) |
| `npm run db:deploy` | Aplica migrations em produção (`prisma migrate deploy`) |
| `npm run db:generate` | Regenera o client Prisma após alterar o schema |
| `npm run db:seed` | Popula o banco com dados iniciais |
| `npm run db:studio` | Interface visual do Prisma para inspecionar o banco |

## Documentação completa

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — decisões de arquitetura, estrutura de pastas, padrões de código
- [`DATABASE.md`](./DATABASE.md) — modelo de dados, relacionamentos, decisões de modelagem
- [`DEPLOY.md`](./DEPLOY.md) — como o deploy em produção foi feito (Railway) e como publicar atualizações
- [`ROADMAP.md`](./ROADMAP.md) — o que já existe, o que falta, e prioridades sugeridas para a Fase 2

## Módulos implementados (Fase 1 — MVP)

- **Autenticação e permissões** — 3 perfis (Operacional, Gestor, Admin) com controle de acesso por rota e por ação
- **Cadastros** — condomínios, síndicos, fornecedores, categorias financeiras, usuários
- **Financeiro** — lançamentos (receitas/despesas), contas a pagar/receber com baixa automática, fluxo de caixa consolidado com projeção
- **Prestação de contas** (módulo principal) — geração automática a partir dos lançamentos, fluxo de aprovação Rascunho → Em Revisão → Publicada, reabertura controlada (exceção auditada), exportação em PDF e Excel com identidade visual da empresa
- **Painel executivo** — indicadores consolidados, alertas de vencimento, prestações pendentes de ação
- **Auditoria** — trilha completa de criações, alterações, exclusões, publicações e tentativas de login

O que ainda não foi implementado está detalhado em `ROADMAP.md`.
