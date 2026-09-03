# Roadmap

## Fase 1 (entregue nesta versão) — MVP robusto

- [x] Autenticação (login, sessão JWT, logout) e 3 perfis de permissão
- [x] Cadastros: condomínios, síndicos, fornecedores, categorias financeiras, usuários
- [x] Financeiro: lançamentos, contas a pagar/receber com baixa automática, fluxo de caixa consolidado com projeção de 30/60 dias
- [x] **Prestação de contas** (módulo principal):
  - [x] Geração automática a partir dos lançamentos do mês
  - [x] Fluxo de aprovação Rascunho → Em Revisão → Publicada (separação entre quem lança e quem aprova)
  - [x] Recalculagem de itens em rascunho (captura lançamentos adicionados depois da geração inicial)
  - [x] Reabertura controlada de prestação publicada (exceção auditada, restrita a ADMIN, com motivo obrigatório)
  - [x] Exportação em PDF com identidade visual da Bem Viver (preto e dourado)
  - [x] Exportação em Excel formatada
- [x] Painel executivo com KPIs, gráfico consolidado de 6 meses, alertas de vencimento e prestações pendentes de ação
- [x] Auditoria: trilha completa de criações/alterações/exclusões/publicações/logins, com filtro e visualização de detalhes
- [x] Build de produção validado (`next build`), type-check limpo, lint limpo, testes end-to-end automatizados

## Correções aplicadas nesta fase

Durante a validação end-to-end com Playwright, dois problemas reais foram
encontrados em telas já existentes (não introduzidos nesta sessão, mas
descobertos por ela) e corrigidos:

1. **Vazamento de hash de senha para o navegador** (`/dashboard/configuracoes/usuarios`) —
   a consulta ao banco trazia o registro completo do usuário, incluindo
   `senhaHash`, e repassava para o componente de edição no cliente. Corrigido
   com `select` explícito no Prisma (nunca buscar `senhaHash` fora da
   camada de autenticação) e reconstrução explícita do objeto passado ao
   componente.
2. **Erro de serialização ao editar lançamentos e condomínios** — o código
   espalhava (`...registro`) o objeto inteiro vindo do Prisma, incluindo
   relações aninhadas com campos `Decimal`, para dentro de um Client
   Component. Corrigido reconstruindo o objeto campo a campo em todas as
   telas de edição.
3. **Página `/dashboard` (painel executivo) não existia** — o layout da
   área autenticada existia, mas faltava a página em si, então todo login
   caía em uma tela 404. Implementada como parte desta fase.
4. **Página `/dashboard/auditoria` não existia** — o menu já linkava para
   ela, mas a página nunca tinha sido criada. Implementada como parte
   desta fase.

Estas quatro correções foram encontradas justamente pelo processo de
validação visual/funcional (não apenas `tsc`/`lint`, que não capturam
esses dois primeiros problemas — eles só aparecem em runtime). Reforça a
importância de manter os scripts em `scripts/smoke-test*.mjs` rodando a
cada mudança relevante nas telas de cadastro.

## Fase 2 — sugestões, em ordem de prioridade recomendada

A ordem abaixo é uma recomendação baseada em impacto operacional imediato
vs. esforço de implementação — não uma obrigação. Ajuste conforme a
prioridade real da operação da Bem Viver mudar.

### Alta prioridade

1. **Cadastro de Unidades e Moradores.** O schema já existe (`Unidade`,
   `Morador`) e está pronto para uso, mas não há Server Actions nem telas
   ainda. Sem isso, o sistema sabe quanto cada condomínio arrecadou no
   total, mas não consegue detalhar inadimplência por unidade — que é
   provavelmente a funcionalidade de maior valor percebido pelos síndicos
   depois da própria prestação de contas.
2. **Envio automático da prestação de contas por e-mail/WhatsApp.**
   Hoje o PDF é gerado e baixado manualmente para depois ser enviado ao
   síndico "como já era feito antes". Automatizar esse último passo
   (ex: botão "Enviar ao síndico" que dispara e-mail com o PDF anexado)
   fecha o ciclo e é a mudança de processo com maior redução de trabalho
   manual repetitivo.
3. **Recuperação de senha.** A tabela `TokenRecuperacaoSenha` já existe no
   schema, mas o fluxo de "esqueci minha senha" ainda não foi implementado
   — hoje, redefinir senha de um usuário exige que um ADMIN o faça
   manualmente pela tela de usuários.

### Média prioridade

4. **Central de documentos.** Schema (`Documento`) já modelado. Permitiria
   subir e organizar contratos, atas de assembleia, comprovantes, etc. por
   condomínio — hoje isso continua fora do sistema.
5. **Contratos com alerta de vencimento.** Schema (`Contrato`) já
   modelado. Um card no painel executivo alertando contratos vencendo nos
   próximos 60 dias é uma extensão natural do que já existe para títulos
   financeiros.
6. **Fundo de reserva.** Schema (`MovimentoFundoReserva`) já modelado, sem
   tela ainda. Relevante para condomínios que mantêm reserva financeira
   separada do caixa corrente.
7. **Inadimplência detalhada por unidade** — depende do item 1
   (Unidades/Moradores) estar pronto primeiro.

### Baixa prioridade / mais longo prazo

8. **Notificações internas** (ex: aviso quando uma prestação é enviada
   para revisão, ou quando um título vence).
9. **Portal do síndico** — hoje o síndico continua recebendo o PDF por
   fora do sistema (WhatsApp/e-mail), como definido conscientemente para a
   Fase 1. Um portal com login próprio para o síndico consultar
   prestações e documentos é uma expansão de escopo relevante, mas exige
   pensar autenticação/autorização para um público externo à equipe da
   Bem Viver — vale ser um projeto à parte, não um incremento pequeno.
10. **Suíte de testes automatizados** (unitários com Vitest, integração
    com os Server Actions). Os smoke tests com Playwright cobrem o
    caminho feliz das telas principais, mas não substituem testes
    unitários das regras de negócio (ex: cálculo de saldo, hierarquia de
    permissões) — importante à medida que mais pessoas passem a alterar o
    código.
11. **CI/CD** — hoje o deploy contínuo já existe via integração
    Vercel + GitHub, mas não há pipeline rodando `lint`/`build`/testes
    automaticamente antes do merge. Vale configurar assim que houver mais
    de uma pessoa contribuindo com código.

## Decisões conscientemente deixadas de fora do MVP

- **Acesso do síndico ao sistema** — por decisão explícita já tomada no
  início do projeto, esta fase é de uso interno da equipe Bem Viver. Os
  síndicos continuam recebendo PDFs por WhatsApp/e-mail como já faziam.
- **Mediação de conflitos entre condôminos** — é um processo humano, não
  um problema de software. O sistema pode, no futuro, ajudar a
  *documentar* o histórico de um conflito (ex: anexar comunicações à
  central de documentos do item 4), mas não substitui o trabalho de
  mediação em si.
