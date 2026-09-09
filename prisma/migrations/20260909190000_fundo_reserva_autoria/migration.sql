-- AlterTable
-- Tabela "movimentos_fundo_reserva" nunca teve tela, Server Action ou seed —
-- confirmado sem linhas em produção, portanto NOT NULL sem backfill é seguro.
ALTER TABLE "movimentos_fundo_reserva"
  ADD COLUMN     "criadoPorId" TEXT NOT NULL,
  ADD COLUMN     "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "movimentos_fundo_reserva" ADD CONSTRAINT "movimentos_fundo_reserva_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
