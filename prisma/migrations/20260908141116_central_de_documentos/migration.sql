-- AlterEnum
ALTER TYPE "CategoriaDocumento" ADD VALUE 'COMUNICADO';

-- AlterTable
ALTER TABLE "documentos"
  ADD COLUMN     "descricao" TEXT,
  ADD COLUMN     "arquivoNome" TEXT,
  ADD COLUMN     "arquivoTipo" TEXT,
  ADD COLUMN     "dataValidade" TIMESTAMP(3),
  ADD COLUMN     "excluidoEm" TIMESTAMP(3),
  ADD COLUMN     "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "documentos_condominioId_categoria_idx" ON "documentos"("condominioId", "categoria");

-- CreateIndex
CREATE INDEX "documentos_condominioId_dataValidade_idx" ON "documentos"("condominioId", "dataValidade");
