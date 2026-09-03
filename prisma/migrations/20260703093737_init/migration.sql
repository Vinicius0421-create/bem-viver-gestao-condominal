-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('ADMIN', 'GESTOR', 'OPERACIONAL');

-- CreateEnum
CREATE TYPE "StatusCondominio" AS ENUM ('ATIVO', 'INATIVO', 'PROSPECT');

-- CreateEnum
CREATE TYPE "TipoSindico" AS ENUM ('PROFISSIONAL', 'MORADOR');

-- CreateEnum
CREATE TYPE "StatusUnidade" AS ENUM ('OCUPADA', 'VAGA', 'EM_OBRAS');

-- CreateEnum
CREATE TYPE "TipoVinculoMorador" AS ENUM ('PROPRIETARIO', 'INQUILINO', 'DEPENDENTE');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "NaturezaLancamento" AS ENUM ('FIXA', 'EXTRA', 'BANCARIA', 'REPASSE');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'BOLETO', 'TED', 'DOC', 'DEBITO_AUTOMATICO', 'DINHEIRO', 'CARTAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusTitulo" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoTitulo" AS ENUM ('PAGAR', 'RECEBER');

-- CreateEnum
CREATE TYPE "StatusPrestacaoContas" AS ENUM ('RASCUNHO', 'EM_REVISAO', 'PUBLICADA');

-- CreateEnum
CREATE TYPE "CategoriaDocumento" AS ENUM ('CONTRATO', 'ATA', 'COMPROVANTE', 'CONVENCAO', 'REGIMENTO_INTERNO', 'OUTRO');

-- CreateEnum
CREATE TYPE "AcaoAuditoria" AS ENUM ('CRIACAO', 'ATUALIZACAO', 'EXCLUSAO', 'PUBLICACAO', 'LOGIN', 'LOGIN_FALHOU');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL DEFAULT 'OPERACIONAL',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT,
    "telefone" TEXT,
    "ultimoLoginEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_recuperacao_senha" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_recuperacao_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sindicos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "tipo" "TipoSindico" NOT NULL DEFAULT 'PROFISSIONAL',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sindicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condominios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" VARCHAR(2),
    "cep" TEXT,
    "banco" TEXT,
    "agencia" TEXT,
    "conta" TEXT,
    "qtdUnidades" INTEGER,
    "valorHonorarios" DECIMAL(12,2),
    "diaVencimentoTaxa" INTEGER,
    "dataInicioContrato" TIMESTAMP(3),
    "dataFimContrato" TIMESTAMP(3),
    "status" "StatusCondominio" NOT NULL DEFAULT 'ATIVO',
    "sindicoId" TEXT,
    "observacoes" TEXT,
    "excluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condominios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "identificacao" TEXT NOT NULL,
    "bloco" TEXT,
    "fracaoIdeal" DECIMAL(8,5),
    "valorTaxaBase" DECIMAL(12,2),
    "status" "StatusUnidade" NOT NULL DEFAULT 'OCUPADA',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moradores" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "tipoVinculo" "TipoVinculoMorador" NOT NULL DEFAULT 'PROPRIETARIO',
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moradores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpjCpf" TEXT,
    "categoria" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_financeiras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "natureza" "NaturezaLancamento" NOT NULL DEFAULT 'FIXA',
    "cor" TEXT DEFAULT '#C9A227',
    "padraoSistema" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_financeiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos_financeiros" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "fornecedorId" TEXT,
    "tipo" "TipoLancamento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "competenciaMes" INTEGER NOT NULL,
    "competenciaAno" INTEGER NOT NULL,
    "dataMovimento" TIMESTAMP(3) NOT NULL,
    "formaPagamento" "FormaPagamento",
    "comprovanteUrl" TEXT,
    "observacoes" TEXT,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "criadoPorId" TEXT NOT NULL,
    "excluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lancamentos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titulos_financeiros" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "tipo" "TipoTitulo" NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoriaId" TEXT,
    "fornecedorId" TEXT,
    "unidadeId" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "status" "StatusTitulo" NOT NULL DEFAULT 'PENDENTE',
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "excluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "titulos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestacoes_contas" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "competenciaMes" INTEGER NOT NULL,
    "competenciaAno" INTEGER NOT NULL,
    "saldoAnterior" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalReceitas" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDespesas" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldoAtual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "StatusPrestacaoContas" NOT NULL DEFAULT 'RASCUNHO',
    "pdfUrl" TEXT,
    "observacoes" TEXT,
    "publicadoPorId" TEXT,
    "publicadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prestacoes_contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestacoes_contas_itens" (
    "id" TEXT NOT NULL,
    "prestacaoContasId" TEXT NOT NULL,
    "lancamentoId" TEXT NOT NULL,
    "valorConsiderado" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "prestacoes_contas_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentos_fundo_reserva" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "competenciaMes" INTEGER NOT NULL,
    "competenciaAno" INTEGER NOT NULL,
    "saldoInicial" DECIMAL(12,2) NOT NULL,
    "aportes" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "resgates" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rendimento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldoFinal" DECIMAL(12,2) NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentos_fundo_reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT,
    "nome" TEXT NOT NULL,
    "categoria" "CategoriaDocumento" NOT NULL DEFAULT 'OUTRO',
    "arquivoUrl" TEXT NOT NULL,
    "tamanhoBytes" INTEGER,
    "enviadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "fornecedorId" TEXT,
    "tipo" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "valor" DECIMAL(12,2),
    "periodicidade" TEXT,
    "arquivoUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" "AcaoAuditoria" NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "dadosAntes" JSONB,
    "dadosDepois" JSONB,
    "ip" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_recuperacao_senha_token_key" ON "tokens_recuperacao_senha"("token");

-- CreateIndex
CREATE UNIQUE INDEX "sindicos_cpf_key" ON "sindicos"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "condominios_cnpj_key" ON "condominios"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_condominioId_identificacao_key" ON "unidades"("condominioId", "identificacao");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_financeiras_nome_tipo_key" ON "categorias_financeiras"("nome", "tipo");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_condominioId_competenciaAno_compete_idx" ON "lancamentos_financeiros"("condominioId", "competenciaAno", "competenciaMes");

-- CreateIndex
CREATE INDEX "titulos_financeiros_condominioId_status_dataVencimento_idx" ON "titulos_financeiros"("condominioId", "status", "dataVencimento");

-- CreateIndex
CREATE UNIQUE INDEX "prestacoes_contas_condominioId_competenciaMes_competenciaAn_key" ON "prestacoes_contas"("condominioId", "competenciaMes", "competenciaAno");

-- CreateIndex
CREATE UNIQUE INDEX "prestacoes_contas_itens_prestacaoContasId_lancamentoId_key" ON "prestacoes_contas_itens"("prestacaoContasId", "lancamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "movimentos_fundo_reserva_condominioId_competenciaMes_compet_key" ON "movimentos_fundo_reserva"("condominioId", "competenciaMes", "competenciaAno");

-- CreateIndex
CREATE INDEX "logs_auditoria_entidade_entidadeId_idx" ON "logs_auditoria"("entidade", "entidadeId");

-- AddForeignKey
ALTER TABLE "tokens_recuperacao_senha" ADD CONSTRAINT "tokens_recuperacao_senha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condominios" ADD CONSTRAINT "condominios_sindicoId_fkey" FOREIGN KEY ("sindicoId") REFERENCES "sindicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moradores" ADD CONSTRAINT "moradores_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_financeiras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulos_financeiros" ADD CONSTRAINT "titulos_financeiros_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulos_financeiros" ADD CONSTRAINT "titulos_financeiros_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulos_financeiros" ADD CONSTRAINT "titulos_financeiros_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulos_financeiros" ADD CONSTRAINT "titulos_financeiros_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestacoes_contas" ADD CONSTRAINT "prestacoes_contas_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestacoes_contas" ADD CONSTRAINT "prestacoes_contas_publicadoPorId_fkey" FOREIGN KEY ("publicadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestacoes_contas_itens" ADD CONSTRAINT "prestacoes_contas_itens_prestacaoContasId_fkey" FOREIGN KEY ("prestacaoContasId") REFERENCES "prestacoes_contas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestacoes_contas_itens" ADD CONSTRAINT "prestacoes_contas_itens_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "lancamentos_financeiros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_fundo_reserva" ADD CONSTRAINT "movimentos_fundo_reserva_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "condominios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
