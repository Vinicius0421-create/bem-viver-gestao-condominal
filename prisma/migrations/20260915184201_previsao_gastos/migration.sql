-- CreateEnum
CREATE TYPE "StatusPrevisaoGastos" AS ENUM ('RASCUNHO', 'PUBLICADA');

-- CreateEnum
CREATE TYPE "TipoItemPrevisaoGastos" AS ENUM ('ORDINARIA', 'EXTRAORDINARIA');

-- CreateTable
CREATE TABLE "previsoes_gastos" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "competenciaMes" INTEGER NOT NULL,
    "competenciaAno" INTEGER NOT NULL,
    "diaLimitePagamento" INTEGER,
    "valorTotalGeral" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorTotalPorUnidade" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "StatusPrevisaoGastos" NOT NULL DEFAULT 'RASCUNHO',
    "pdfUrl" TEXT,
    "observacoes" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "publicadoPorId" TEXT,
    "publicadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "previsoes_gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_previsao_gastos" (
    "id" TEXT NOT NULL,
    "previsaoId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "tipo" "TipoItemPrevisaoGastos" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "valorPorUnidade" DECIMAL(12,2),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_previsao_gastos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "previsoes_gastos_condominioId_competenciaMes_competenciaAno_key" ON "previsoes_gastos"("condominioId", "competenciaMes", "competenciaAno");

-- CreateIndex
CREATE INDEX "itens_previsao_gastos_previsaoId_idx" ON "itens_previsao_gastos"("previsaoId");

-- AddForeignKey
ALTER TABLE "previsoes_gastos" ADD CONSTRAINT "previsoes_gastos_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "previsoes_gastos" ADD CONSTRAINT "previsoes_gastos_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "previsoes_gastos" ADD CONSTRAINT "previsoes_gastos_publicadoPorId_fkey" FOREIGN KEY ("publicadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_previsao_gastos" ADD CONSTRAINT "itens_previsao_gastos_previsaoId_fkey" FOREIGN KEY ("previsaoId") REFERENCES "previsoes_gastos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_previsao_gastos" ADD CONSTRAINT "itens_previsao_gastos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
