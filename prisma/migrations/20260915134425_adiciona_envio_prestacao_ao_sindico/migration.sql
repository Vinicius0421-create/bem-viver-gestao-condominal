-- AlterTable
ALTER TABLE "contratos" ALTER COLUMN "atualizadoEm" DROP DEFAULT;

-- AlterTable
ALTER TABLE "documentos" ALTER COLUMN "atualizadoEm" DROP DEFAULT;

-- AlterTable
ALTER TABLE "movimentos_fundo_reserva" ALTER COLUMN "atualizadoEm" DROP DEFAULT;

-- AlterTable
ALTER TABLE "prestacoes_contas" ADD COLUMN     "enviadoAoSindicoEm" TIMESTAMP(3),
ADD COLUMN     "enviadoAoSindicoPorId" TEXT;

-- AddForeignKey
ALTER TABLE "prestacoes_contas" ADD CONSTRAINT "prestacoes_contas_enviadoAoSindicoPorId_fkey" FOREIGN KEY ("enviadoAoSindicoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
