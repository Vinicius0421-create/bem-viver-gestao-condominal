-- Fase 2 do Plano de Evolução V2: CategoriaFinanceira ganha ordenação
-- explícita (ordem) e hierarquia de 1 nível (subcategoria de uma categoria
-- principal), no mesmo padrão de categorias_documento (padraoSistema,
-- ordem). Também amplia o catálogo padrão com as categorias citadas no
-- complemento (água/SAAE, energia, gás, portaria, CFTV, elevadores,
-- dedetização, folha/encargos, fundo de reserva, cotas) que ainda não
-- existiam. Não altera nem remove nenhuma das 19 categorias já existentes
-- (nome, tipo e id preservados) — só adiciona colunas e linhas novas.

-- AlterTable
ALTER TABLE "categorias_financeiras" ADD COLUMN "ordem" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "categorias_financeiras" ADD COLUMN "categoriaPaiId" TEXT;

-- CreateIndex
CREATE INDEX "categorias_financeiras_categoriaPaiId_idx" ON "categorias_financeiras"("categoriaPaiId");

-- AddForeignKey
ALTER TABLE "categorias_financeiras" ADD CONSTRAINT "categorias_financeiras_categoriaPaiId_fkey" FOREIGN KEY ("categoriaPaiId") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ordena as 19 categorias já existentes (identificadas por nome+tipo, já
-- que os ids são cuid gerados dinamicamente pelo seed original, não fixos).
-- Receitas 1-6, despesas 1-19; "Outras Receitas"/"Outras Despesas" ficam
-- com ordem 99, igual ao padrão já usado em categorias_documento para
-- "Outro".
UPDATE "categorias_financeiras" SET "ordem" = 1  WHERE "nome" = 'Taxa de Condomínio' AND "tipo" = 'RECEITA';
UPDATE "categorias_financeiras" SET "ordem" = 3  WHERE "nome" = 'Multas e Juros' AND "tipo" = 'RECEITA';
UPDATE "categorias_financeiras" SET "ordem" = 4  WHERE "nome" = 'Repasse de Cobrança/Terceiros' AND "tipo" = 'RECEITA';
UPDATE "categorias_financeiras" SET "ordem" = 5  WHERE "nome" = 'Resgate de Aplicação Financeira' AND "tipo" = 'RECEITA';
UPDATE "categorias_financeiras" SET "ordem" = 6  WHERE "nome" = 'Aluguel de Área Comum' AND "tipo" = 'RECEITA';
UPDATE "categorias_financeiras" SET "ordem" = 99 WHERE "nome" = 'Outras Receitas' AND "tipo" = 'RECEITA';

UPDATE "categorias_financeiras" SET "ordem" = 1  WHERE "nome" = 'Água e Esgoto' AND "tipo" = 'DESPESA';
UPDATE "categorias_financeiras" SET "ordem" = 2  WHERE "nome" = 'Energia Elétrica' AND "tipo" = 'DESPESA';
UPDATE "categorias_financeiras" SET "ordem" = 4  WHERE "nome" = 'Internet/Telefonia' AND "tipo" = 'DESPESA';
UPDATE "categorias_financeiras" SET "ordem" = 5  WHERE "nome" = 'Limpeza e Conservação' AND "tipo" = 'DESPESA';
UPDATE "categorias_financeiras" SET "ordem" = 10 WHERE "nome" = 'Sinalização e Segurança' AND "tipo" = 'DESPESA';
UPDATE "categorias_financeiras" SET "ordem" = 11 WHERE "nome" = 'Honorários Bem Viver' AND "tipo" = 'DESPESA';
UPDATE "categorias_financeiras" SET "ordem" = 12 WHERE "nome" = 'Pagamento Síndico' AND "tipo" = 'DESPESA';
UPDATE "categorias_financeiras" SET "ordem" = 14 WHERE "nome" = 'Financiamento/Obra' AND "tipo" = 'DESPESA';
UPDATE "categorias_financeiras" SET "ordem" = 16 WHERE "nome" = 'Tarifa Bancária' AND "tipo" = 'DESPESA';
UPDATE "categorias_financeiras" SET "ordem" = 17 WHERE "nome" = 'Manutenção e Reparos' AND "tipo" = 'DESPESA';
UPDATE "categorias_financeiras" SET "ordem" = 18 WHERE "nome" = 'Serviços Cartorários/Jurídicos' AND "tipo" = 'DESPESA';
UPDATE "categorias_financeiras" SET "ordem" = 19 WHERE "nome" = 'Seguro Predial' AND "tipo" = 'DESPESA';
UPDATE "categorias_financeiras" SET "ordem" = 99 WHERE "nome" = 'Outras Despesas' AND "tipo" = 'DESPESA';

-- Novas categorias do catálogo ampliado. IDs fixos e legíveis (mesmo
-- padrão de categorias_documento) só para facilitar auditoria/depuração —
-- não são usados em nenhum backfill nesta migration.
INSERT INTO "categorias_financeiras" ("id", "nome", "tipo", "natureza", "cor", "ordem", "padraoSistema", "ativo", "categoriaPaiId") VALUES
  ('catfin_cotas_extra', 'Cotas Extraordinárias/Rateio', 'RECEITA', 'EXTRA', '#C9A227', 2, true, true,
    (SELECT "id" FROM "categorias_financeiras" WHERE "nome" = 'Taxa de Condomínio' AND "tipo" = 'RECEITA')),
  ('catfin_gas', 'Gás', 'DESPESA', 'FIXA', '#C9A227', 3, true, true, NULL),
  ('catfin_portaria', 'Portaria e Vigilância', 'DESPESA', 'FIXA', '#C9A227', 6, true, true, NULL),
  ('catfin_elevadores', 'Manutenção de Elevadores', 'DESPESA', 'FIXA', '#C9A227', 7, true, true, NULL),
  ('catfin_cftv', 'Manutenção de CFTV e Portão Eletrônico', 'DESPESA', 'FIXA', '#C9A227', 8, true, true, NULL),
  ('catfin_dedetizacao', 'Dedetização e Controle de Pragas', 'DESPESA', 'EXTRA', '#C9A227', 9, true, true, NULL),
  ('catfin_folha', 'Folha de Pagamento e Encargos (Funcionários)', 'DESPESA', 'FIXA', '#C9A227', 13, true, true, NULL),
  ('catfin_fundo_reserva', 'Contribuição ao Fundo de Reserva', 'DESPESA', 'FIXA', '#C9A227', 15, true, true, NULL);
