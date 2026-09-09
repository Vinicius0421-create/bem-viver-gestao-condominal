-- AlterTable
ALTER TABLE "condominios" ADD COLUMN "razaoSocial" TEXT;

-- CreateEnum
CREATE TYPE "PapelRepresentanteCondominio" AS ENUM ('SUBSINDICO', 'CONSELHEIRO', 'CONSELHEIRO_PRESIDENTE');

-- CreateTable
CREATE TABLE "representantes_condominio" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "papel" "PapelRepresentanteCondominio" NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "representantes_condominio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contatos_condominio" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contatos_condominio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "representantes_condominio_condominioId_papel_ativo_idx" ON "representantes_condominio"("condominioId", "papel", "ativo");

-- CreateIndex
CREATE INDEX "contatos_condominio_condominioId_ativo_idx" ON "contatos_condominio"("condominioId", "ativo");

-- AddForeignKey
ALTER TABLE "representantes_condominio" ADD CONSTRAINT "representantes_condominio_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contatos_condominio" ADD CONSTRAINT "contatos_condominio_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
