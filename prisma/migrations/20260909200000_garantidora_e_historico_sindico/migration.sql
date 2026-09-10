-- Fase 1 do Sistema de Gestão (Relatório de Descoberta, set/2026):
--   1) conceito de Garantidora (empresa terceirizada de cobrança/garantia),
--      historizado por condomínio via CondominioGarantidora;
--   2) papel SINDICO em PapelRepresentanteCondominio, para permitir
--      histórico de mandato de síndico (ver migração seguinte para o
--      backfill dos dados já existentes — precisa rodar em transação
--      separada, já que o Postgres não permite usar um valor de enum
--      recém-criado na mesma transação em que ele foi adicionado).

-- AlterEnum
ALTER TYPE "PapelRepresentanteCondominio" ADD VALUE 'SINDICO';

-- CreateTable
CREATE TABLE "garantidoras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "taxaPadrao" DECIMAL(5,2),
    "telefone" TEXT,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garantidoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condominio_garantidoras" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "garantidoraId" TEXT NOT NULL,
    "taxaAplicada" DECIMAL(5,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condominio_garantidoras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "garantidoras_nome_key" ON "garantidoras"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "garantidoras_cnpj_key" ON "garantidoras"("cnpj");

-- CreateIndex
CREATE INDEX "condominio_garantidoras_condominioId_ativo_idx" ON "condominio_garantidoras"("condominioId", "ativo");

-- CreateIndex
CREATE INDEX "condominio_garantidoras_garantidoraId_idx" ON "condominio_garantidoras"("garantidoraId");

-- AddForeignKey
ALTER TABLE "condominio_garantidoras" ADD CONSTRAINT "condominio_garantidoras_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condominio_garantidoras" ADD CONSTRAINT "condominio_garantidoras_garantidoraId_fkey" FOREIGN KEY ("garantidoraId") REFERENCES "garantidoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
