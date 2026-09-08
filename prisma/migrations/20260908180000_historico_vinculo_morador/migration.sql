-- AlterTable
ALTER TABLE "moradores"
  ADD COLUMN     "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN     "dataFim" TIMESTAMP(3);

-- Backfill: para registros já existentes, a melhor aproximação real do
-- início do vínculo é a data em que o cadastro foi criado no sistema.
-- Não é preenchido `dataFim` para moradores já inativos: não há, para
-- dados pré-existentes, um timestamp confiável de quando o vínculo
-- realmente terminou (mesmo tratamento transparente já usado no Sprint 3
-- para títulos financeiros sem unidade vinculada).
UPDATE "moradores" SET "dataInicio" = "criadoEm";

-- CreateIndex
CREATE INDEX "moradores_unidadeId_ativo_idx" ON "moradores"("unidadeId", "ativo");
