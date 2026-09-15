-- Nova categoria de documento (dado, não schema): "Previsão de Faturamento".
-- Documento real encontrado no Drive (ex.: Primavera, "Previsao de
-- Faturamento.pdf") — projeção anual de receita mês a mês, assinada pela
-- síndica e pelo contador (CRC). Diferente de Previsão de Gastos (nova
-- tabela `previsoes_gastos`), é um documento contábil estático e anual, não
-- um fluxo operacional recorrente — por isso entra só como mais uma linha
-- em `categorias_documento`, não como uma tabela relacional própria.
-- Não é `padraoSistema` (não veio do enum original), então pode ser
-- desativada/reordenada livremente pela tela de categorias.
INSERT INTO "categorias_documento" ("id", "nome", "ordem", "padraoSistema", "atualizadoEm") VALUES
  ('catdoc_previsao_faturamento', 'Previsão de Faturamento', 7, false, CURRENT_TIMESTAMP);
