-- Migra Documento.categoria de enum fixo (CategoriaDocumento) para tabela
-- configurável (categorias_documento), no mesmo padrão de CategoriaFinanceira.
-- Preserva 100% dos dados existentes: cada um dos 7 valores do enum vira uma
-- linha "padraoSistema" na nova tabela, e todo documento já cadastrado é
-- religado à linha correspondente antes da coluna antiga ser removida.

-- CreateTable
CREATE TABLE "categorias_documento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT DEFAULT '#b3892f',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "padraoSistema" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_documento_nome_key" ON "categorias_documento"("nome");

-- Seed: as 7 categorias que antes eram valores fixos do enum CategoriaDocumento,
-- com os mesmos rótulos já usados na UI (ver CATEGORIA_LABEL em
-- documento-form-dialog.tsx). IDs estáveis e legíveis (não cuid) propositalmente,
-- só para esta migração de dados — permitem o UPDATE abaixo sem uma etapa
-- intermediária de lookup.
INSERT INTO "categorias_documento" ("id", "nome", "ordem", "padraoSistema", "atualizadoEm") VALUES
  ('catdoc_contrato',    'Contrato', 1, true, CURRENT_TIMESTAMP),
  ('catdoc_ata',         'Ata de assembleia', 2, true, CURRENT_TIMESTAMP),
  ('catdoc_comprovante', 'Documento financeiro (comprovante/nota fiscal)', 3, true, CURRENT_TIMESTAMP),
  ('catdoc_convencao',   'Convenção do condomínio', 4, true, CURRENT_TIMESTAMP),
  ('catdoc_regimento',   'Regimento interno', 5, true, CURRENT_TIMESTAMP),
  ('catdoc_comunicado',  'Comunicado/circular', 6, true, CURRENT_TIMESTAMP),
  ('catdoc_outro',       'Outro', 99, true, CURRENT_TIMESTAMP);

-- AlterTable: nova coluna, ainda opcional até migrarmos os dados existentes
ALTER TABLE "documentos" ADD COLUMN "categoriaId" TEXT;

-- Religa cada documento existente à categoria configurável correspondente
UPDATE "documentos" SET "categoriaId" = CASE "categoria"
  WHEN 'CONTRATO' THEN 'catdoc_contrato'
  WHEN 'ATA' THEN 'catdoc_ata'
  WHEN 'COMPROVANTE' THEN 'catdoc_comprovante'
  WHEN 'CONVENCAO' THEN 'catdoc_convencao'
  WHEN 'REGIMENTO_INTERNO' THEN 'catdoc_regimento'
  WHEN 'COMUNICADO' THEN 'catdoc_comunicado'
  ELSE 'catdoc_outro'
END;

-- Agora que todo registro tem categoriaId, a coluna passa a ser obrigatória
ALTER TABLE "documentos" ALTER COLUMN "categoriaId" SET NOT NULL;

-- Remove o índice e a coluna antigos (baseados no enum)
DROP INDEX IF EXISTS "documentos_condominioId_categoria_idx";
ALTER TABLE "documentos" DROP COLUMN "categoria";
DROP TYPE "CategoriaDocumento";

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex (equivalente ao antigo, agora sobre a FK)
CREATE INDEX "documentos_condominioId_categoriaId_idx" ON "documentos"("condominioId", "categoriaId");
