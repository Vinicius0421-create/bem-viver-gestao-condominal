# Deploy em produção — Railway

O sistema está publicado no Railway, na conta pessoal do usuário
(`vinituber09@gmail.com`), dentro do projeto **bemviver-sistema**. Este
documento descreve exatamente como o deploy foi feito, para que qualquer
alteração futura (nova migration, nova variável de ambiente, etc.) possa
ser aplicada do mesmo jeito.

> Havia um plano inicial de usar Vercel (hospedagem) + Supabase
> (PostgreSQL), ambos no plano gratuito. Ele foi trocado por Railway
> porque a conta já existia, o que eliminou a etapa de criar e configurar
> duas contas novas — o deploy inteiro (projeto, banco, variáveis, build,
> migração, seed) foi feito via CLI, sem exigir nenhuma ação manual no
> painel além da autenticação inicial. O custo passou de R$ 0/mês para a
> faixa de ~US$ 5/mês (ver seção de custos abaixo), considerado um
> trade-off aceitável pela simplicidade operacional.

## 1. Estrutura no Railway

Um projeto (`bemviver-sistema`) com dois serviços:

| Serviço | O que é | Domínio |
|---|---|---|
| `Postgres` | PostgreSQL gerenciado (imagem `ghcr.io/railwayapp-templates/postgres-ssl:18`), com volume persistente de 500 MB | interno apenas (`postgres.railway.internal`) |
| `bemviver-app` | A aplicação Next.js | **https://bemviver-app-production.up.railway.app** |

Os dois serviços estão no mesmo ambiente (`production`) e se comunicam pela
rede privada do Railway — a aplicação nunca expõe a porta do banco
publicamente no dia a dia (existe uma URL pública do banco,
`DATABASE_PUBLIC_URL`, útil só para acessar o banco de fora do Railway,
ex: um cliente SQL local).

## 2. Variáveis de ambiente configuradas em `bemviver-app`

| Nome | Valor | Observação |
|---|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | referência à variável do serviço Postgres — o Railway resolve automaticamente, então nunca precisa ser copiada/colada manualmente |
| `SESSION_SECRET` | gerado com `openssl rand -base64 32` | valor **diferente** do usado em desenvolvimento local |
| `NODE_ENV` | `production` | ativa cookie de sessão `secure` (só trafega por HTTPS) |

`PORT` é injetada automaticamente pelo Railway; o script de start
(`next start -p ${PORT:-3000}`) já lê essa variável.

## 3. Build e deploy (`railway.json`)

```json
{
  "build": { "builder": "RAILPACK" },
  "deploy": {
    "preDeployCommand": "npm run db:deploy",
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

- **Build:** Railway detecta Next.js automaticamente via Railpack e roda
  `npm install` (que já dispara `prisma generate` via o script
  `postinstall` adicionado ao `package.json`) seguido de `npm run build`.
- **Pre-deploy:** antes de cada novo deploy entrar no ar, `npm run
  db:deploy` (= `prisma migrate deploy`) roda automaticamente contra o
  Postgres do próprio projeto — toda migration nova commitada em
  `prisma/migrations/` é aplicada sem intervenção manual. Isso resolve a
  limitação que existia no plano original com Vercel (lá, a migração
  precisava ser rodada manualmente a cada deploy).
- **Start:** `next start -p $PORT`.

## 4. Deploys seguintes

Como o deploy não está (ainda) conectado a um repositório Git — foi feito
por upload direto do diretório local via `railway up` —, publicar uma
mudança nova é:

```bash
cd app
railway up -s bemviver-app
```

(requer `railway login` uma vez por máquina/sessão; `npx @railway/cli` já
inclui a CLI, não precisa instalar globalmente)

**Recomendação para o próximo passo, fora do escopo desta sessão:**
conectar o serviço a um repositório GitHub (`railway service source
connect --repo ... --service bemviver-app`) para que o deploy passe a
acontecer automaticamente a cada `git push`, com histórico de versões e
possibilidade de rollback pela interface do Railway. Hoje o rollback
existe (`railway down` remove o último deploy), mas sem o histórico
completo que uma integração Git oferece.

## 5. Seed inicial — já executado, não repetir

O script `prisma/seed.ts` já foi executado **uma única vez** contra o
banco de produção (via um `preDeployCommand` temporário, revertido logo
em seguida) e criou:

- O usuário administrador (`bemviverassessoria.cond@gmail.com`)
- As 19 categorias financeiras padrão
- Os 5 fornecedores, os condomínios Barcelia e Montreal
- Os 22 lançamentos financeiros de Junho/2026 e as duas prestações de
  contas já publicadas — com os saldos conferidos automaticamente contra
  os valores das planilhas originais (Barcelia: -R$182,68; Montreal:
  R$1.238,22)

**Não rode `npm run db:seed` de novo contra produção** — ao contrário do
usuário administrador (que usa `upsert`, seguro para rodar mais de uma
vez), os lançamentos financeiros usam `create` e duplicariam os dados de
Junho/2026 a cada execução. Novos usuários devem ser criados pela própria
tela **Configurações → Usuários**.

## 6. Acesso e primeiro login

**URL:** https://bemviver-app-production.up.railway.app

**Login inicial (trocar a senha imediatamente após o primeiro acesso):**
- E-mail: `bemviverassessoria.cond@gmail.com`
- Senha provisória: `BemViver@2026`

## 7. Custos

Plano **Hobby** do Railway: **US$ 5/mês** de assinatura mínima, que já
inclui US$ 5 de crédito de uso — ou seja, para uma aplicação de uso interno
de baixo tráfego como esta (poucos usuários da equipe Bem Viver, sem
tráfego público), o custo real de uso tende a ficar dentro (ou muito perto)
desse crédito, e a cobrança mínima mensal é o teto esperado. Limites do
plano: até 48 vCPU / 48 GB RAM / 5 GB de armazenamento / 6 réplicas —
muito acima do que este sistema usa hoje.

Se o uso crescer (mais condomínios, mais usuários simultâneos, exportações
de PDF/Excel em volume), o próximo degrau é o plano **Pro** (US$ 20/mês
mínimo) — não há necessidade de migrar para ele agora.

## 8. Backups do banco

O volume do Postgres no Railway é persistente, mas confirme no painel do
Railway (**Postgres → Backups**, ou a seção de settings do volume) qual é
a política de backup automático vigente no momento — isso pode variar por
plano e não foi verificado nesta sessão com uma fonte oficial atualizada.
Recomendação: antes de qualquer operação arriscada em produção (ex:
migration destrutiva), tirar um backup manual pelo painel.

## 9. Checklist de segurança antes de divulgar a URL para a equipe

- [x] `SESSION_SECRET` de produção é diferente do valor de desenvolvimento
- [ ] Senha do usuário administrador do seed foi trocada — **fazer no
      primeiro login**
- [x] `DATABASE_URL` de produção não está commitada em nenhum arquivo do
      repositório (fica só nas variáveis de ambiente do Railway)
- [x] HTTPS está ativo (domínio `*.up.railway.app` do Railway já vem com
      certificado válido, nenhuma ação necessária)
- [ ] Cada colaborador da Bem Viver tem seu próprio usuário — nenhum login
      é compartilhado (necessário para a auditoria fazer sentido) — criar
      os usuários da equipe pela tela de Configurações após o primeiro
      acesso
