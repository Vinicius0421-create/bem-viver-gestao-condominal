-- Fase 3 do Plano de Evolução V2: expande os metadados de Documento e dá
-- a CategoriaDocumento a mesma hierarquia de 1 nível já entregue em
-- CategoriaFinanceira na Fase 2. Puramente aditiva — nenhuma coluna
-- removida, nenhum dado existente alterado.

-- AlterTable: hierarquia de subcategoria em categorias_documento (mesmo
-- padrão de categorias_financeiras.categoriaPaiId)
ALTER TABLE "categorias_documento" ADD COLUMN "categoriaPaiId" TEXT;

-- CreateIndex
CREATE INDEX "categorias_documento_categoriaPaiId_idx" ON "categorias_documento"("categoriaPaiId");

-- AddForeignKey
ALTER TABLE "categorias_documento" ADD CONSTRAINT "categorias_documento_categoriaPaiId_fkey" FOREIGN KEY ("categoriaPaiId") REFERENCES "categorias_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: novos metadados em documentos
ALTER TABLE "documentos" ADD COLUMN "competenciaMes" INTEGER;
ALTER TABLE "documentos" ADD COLUMN "competenciaAno" INTEGER;
ALTER TABLE "documentos" ADD COLUMN "fornecedorId" TEXT;
ALTER TABLE "documentos" ADD COLUMN "unidadeId" TEXT;
ALTER TABLE "documentos" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "documentos" ADD COLUMN "hashArquivo" TEXT;
ALTER TABLE "documentos" ADD COLUMN "proveniencia" TEXT NOT NULL DEFAULT 'UPLOAD_MANUAL';

-- CreateIndex
CREATE INDEX "documentos_fornecedorId_idx" ON "documentos"("fornecedorId");
CREATE INDEX "documentos_unidadeId_idx" ON "documentos"("unidadeId");
CREATE INDEX "documentos_condominioId_competenciaAno_competenciaMes_idx" ON "documentos"("condominioId", "competenciaAno", "competenciaMes");

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
