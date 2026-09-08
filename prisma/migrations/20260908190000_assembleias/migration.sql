-- CreateEnum
CREATE TYPE "TipoAssembleia" AS ENUM ('ORDINARIA', 'EXTRAORDINARIA');

-- CreateEnum
CREATE TYPE "StatusAssembleia" AS ENUM ('AGENDADA', 'REALIZADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "assembleias" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "tipo" "TipoAssembleia" NOT NULL DEFAULT 'ORDINARIA',
    "dataHora" TIMESTAMP(3) NOT NULL,
    "local" TEXT,
    "pauta" TEXT NOT NULL,
    "status" "StatusAssembleia" NOT NULL DEFAULT 'AGENDADA',
    "arquivoUrl" TEXT,
    "arquivoNome" TEXT,
    "arquivoTipo" TEXT,
    "tamanhoBytes" INTEGER,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assembleias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assembleias_condominioId_dataHora_idx" ON "assembleias"("condominioId", "dataHora");

-- CreateIndex
CREATE INDEX "assembleias_condominioId_status_idx" ON "assembleias"("condominioId", "status");

-- AddForeignKey
ALTER TABLE "assembleias" ADD CONSTRAINT "assembleias_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
