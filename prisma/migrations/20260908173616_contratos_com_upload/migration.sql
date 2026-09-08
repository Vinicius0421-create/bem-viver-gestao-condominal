-- AlterTable
ALTER TABLE "contratos"
  ADD COLUMN     "nome" TEXT NOT NULL DEFAULT 'Contrato',
  ADD COLUMN     "arquivoNome" TEXT,
  ADD COLUMN     "arquivoTipo" TEXT,
  ADD COLUMN     "tamanhoBytes" INTEGER,
  ADD COLUMN     "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "contratos_condominioId_ativo_idx" ON "contratos"("condominioId", "ativo");

-- CreateIndex
CREATE INDEX "contratos_condominioId_dataFim_idx" ON "contratos"("condominioId", "dataFim");
