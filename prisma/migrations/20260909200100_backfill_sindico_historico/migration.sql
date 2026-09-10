-- Backfill do histórico de síndico (papel SINDICO em
-- representantes_condominio) para os condomínios que já têm um síndico
-- vinculado hoje (Condominio.sindicoId). Precisa ser uma migração separada
-- da que criou o valor 'SINDICO' do enum — o Postgres não permite usar,
-- na mesma transação, um valor de enum recém-adicionado por
-- ALTER TYPE ... ADD VALUE.
--
-- dataInicio usa dataInicioContrato quando disponível (aproximação mais
-- fiel ao início real do mandato), senão a data de criação do registro do
-- condomínio — nunca uma data inventada. A partir de agora, toda troca de
-- síndico feita pela tela de Condomínio (ver salvarCondominio) encerra o
-- registro ativo e cria um novo automaticamente, mantendo o histórico
-- correto daqui em diante.
INSERT INTO "representantes_condominio"
  ("id", "condominioId", "papel", "nome", "cpf", "email", "telefone", "ativo", "dataInicio", "criadoEm", "atualizadoEm")
SELECT
  gen_random_uuid()::text,
  c."id",
  'SINDICO',
  s."nome",
  s."cpf",
  s."email",
  s."telefone",
  true,
  COALESCE(c."dataInicioContrato", c."criadoEm"),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "condominios" c
JOIN "sindicos" s ON s."id" = c."sindicoId"
WHERE c."sindicoId" IS NOT NULL;
