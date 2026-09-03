import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatCurrencyBRL, competenciaLabel, formatDatePtBR } from "@/lib/utils";

// Paleta idêntica à identidade visual da Bem Viver (preto e dourado).
const CORES = {
  preto: "#171310",
  dourado: "#b3892f",
  douradoClaro: "#f5ecc9",
  cinza: "#6b6656",
  cinzaClaro: "#e7e2d6",
  branco: "#ffffff",
  sucesso: "#1f7a4d",
  erro: "#b3261e",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: CORES.preto,
  },
  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: CORES.dourado,
    paddingBottom: 12,
    marginBottom: 16,
  },
  marca: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: CORES.preto,
    letterSpacing: 0.5,
  },
  marcaSub: {
    fontSize: 8,
    color: CORES.dourado,
    marginTop: 2,
    letterSpacing: 1,
  },
  tituloDocumento: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  subtituloDocumento: {
    fontSize: 9,
    color: CORES.cinza,
    textAlign: "right",
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 4,
    alignSelf: "flex-end",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: CORES.branco,
  },
  resumoContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  resumoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: CORES.cinzaClaro,
    borderRadius: 4,
    padding: 8,
  },
  resumoLabel: {
    fontSize: 7.5,
    color: CORES.cinza,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  resumoValor: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  secaoTitulo: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 6,
    color: CORES.preto,
    borderLeftWidth: 3,
    borderLeftColor: CORES.dourado,
    paddingLeft: 6,
  },
  tabela: {
    borderWidth: 1,
    borderColor: CORES.cinzaClaro,
    borderRadius: 3,
  },
  linhaCabecalho: {
    flexDirection: "row",
    backgroundColor: CORES.preto,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  linhaCabecalhoTexto: {
    color: CORES.douradoClaro,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  linha: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: CORES.cinzaClaro,
  },
  linhaTotal: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderTopWidth: 1.5,
    borderTopColor: CORES.preto,
    backgroundColor: "#faf8f2",
  },
  colData: { width: "12%" },
  colDescricao: { width: "46%" },
  colCategoria: { width: "24%" },
  colValor: { width: "18%", textAlign: "right" },
  colLabel: { width: "82%", fontFamily: "Helvetica-Bold" },
  rodape: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: CORES.cinza,
    borderTopWidth: 0.5,
    borderTopColor: CORES.cinzaClaro,
    paddingTop: 6,
  },
});

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "RASCUNHO — NÃO OFICIAL",
  EM_REVISAO: "EM REVISÃO — NÃO OFICIAL",
  PUBLICADA: "DEMONSTRATIVO OFICIAL",
};
const STATUS_COR: Record<string, string> = {
  RASCUNHO: CORES.cinza,
  EM_REVISAO: "#a5690b",
  PUBLICADA: CORES.sucesso,
};

type ItemPdf = {
  id: string;
  valorConsiderado: string;
  lancamento: {
    tipo: "RECEITA" | "DESPESA";
    dataMovimento: Date;
    descricao: string;
    categoria: { nome: string };
    fornecedor: { nome: string } | null;
  };
};

export type PrestacaoContasPdfData = {
  id: string;
  competenciaMes: number;
  competenciaAno: number;
  saldoAnterior: string;
  totalReceitas: string;
  totalDespesas: string;
  saldoAtual: string;
  status: string;
  publicadoEm: Date | null;
  observacoes: string | null;
  condominio: { nome: string; cnpj: string | null; endereco: string | null };
  itens: ItemPdf[];
};

export function PrestacaoContasDocument({ prestacao }: { prestacao: PrestacaoContasPdfData }) {
  const itensReceita = prestacao.itens.filter((i) => i.lancamento.tipo === "RECEITA");
  const itensDespesa = prestacao.itens.filter((i) => i.lancamento.tipo === "DESPESA");

  return (
    <Document
      title={`Prestação de Contas - ${prestacao.condominio.nome} - ${competenciaLabel(prestacao.competenciaMes, prestacao.competenciaAno)}`}
      author="Bem Viver Assessoria Condominial"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.cabecalho}>
          <View>
            <Text style={styles.marca}>BEM VIVER</Text>
            <Text style={styles.marcaSub}>ASSESSORIA CONDOMINIAL</Text>
          </View>
          <View>
            <Text style={styles.tituloDocumento}>Prestação de Contas</Text>
            <Text style={styles.subtituloDocumento}>
              {competenciaLabel(prestacao.competenciaMes, prestacao.competenciaAno)}
            </Text>
            <Text style={styles.subtituloDocumento}>{prestacao.condominio.nome}</Text>
            <Text
              style={[styles.statusBadge, { backgroundColor: STATUS_COR[prestacao.status] }]}
            >
              {STATUS_LABEL[prestacao.status]}
            </Text>
          </View>
        </View>

        <View style={styles.resumoContainer}>
          <View style={styles.resumoCard}>
            <Text style={styles.resumoLabel}>Saldo anterior</Text>
            <Text style={styles.resumoValor}>{formatCurrencyBRL(prestacao.saldoAnterior)}</Text>
          </View>
          <View style={styles.resumoCard}>
            <Text style={styles.resumoLabel}>Total de receitas</Text>
            <Text style={[styles.resumoValor, { color: CORES.sucesso }]}>
              {formatCurrencyBRL(prestacao.totalReceitas)}
            </Text>
          </View>
          <View style={styles.resumoCard}>
            <Text style={styles.resumoLabel}>Total de despesas</Text>
            <Text style={[styles.resumoValor, { color: CORES.erro }]}>
              {formatCurrencyBRL(prestacao.totalDespesas)}
            </Text>
          </View>
          <View style={[styles.resumoCard, { borderColor: CORES.dourado, borderWidth: 1.5 }]}>
            <Text style={styles.resumoLabel}>Saldo atual</Text>
            <Text style={[styles.resumoValor, { color: CORES.dourado }]}>
              {formatCurrencyBRL(prestacao.saldoAtual)}
            </Text>
          </View>
        </View>

        <Text style={styles.secaoTitulo}>Receitas ({itensReceita.length})</Text>
        <View style={styles.tabela}>
          <View style={styles.linhaCabecalho}>
            <Text style={[styles.linhaCabecalhoTexto, styles.colData]}>Data</Text>
            <Text style={[styles.linhaCabecalhoTexto, styles.colDescricao]}>Descrição</Text>
            <Text style={[styles.linhaCabecalhoTexto, styles.colCategoria]}>Categoria</Text>
            <Text style={[styles.linhaCabecalhoTexto, styles.colValor]}>Valor</Text>
          </View>
          {itensReceita.length === 0 && (
            <View style={styles.linha}>
              <Text>Nenhuma receita nesta competência.</Text>
            </View>
          )}
          {itensReceita.map((item) => (
            <View key={item.id} style={styles.linha}>
              <Text style={styles.colData}>{formatDatePtBR(item.lancamento.dataMovimento)}</Text>
              <Text style={styles.colDescricao}>{item.lancamento.descricao}</Text>
              <Text style={styles.colCategoria}>{item.lancamento.categoria.nome}</Text>
              <Text style={[styles.colValor, { color: CORES.sucesso }]}>
                {formatCurrencyBRL(item.valorConsiderado)}
              </Text>
            </View>
          ))}
          <View style={styles.linhaTotal}>
            <Text style={styles.colLabel}>Total de receitas</Text>
            <Text style={[styles.colValor, { fontFamily: "Helvetica-Bold", color: CORES.sucesso }]}>
              {formatCurrencyBRL(prestacao.totalReceitas)}
            </Text>
          </View>
        </View>

        <Text style={styles.secaoTitulo}>Despesas ({itensDespesa.length})</Text>
        <View style={styles.tabela}>
          <View style={styles.linhaCabecalho}>
            <Text style={[styles.linhaCabecalhoTexto, styles.colData]}>Data</Text>
            <Text style={[styles.linhaCabecalhoTexto, styles.colDescricao]}>Descrição</Text>
            <Text style={[styles.linhaCabecalhoTexto, styles.colCategoria]}>Categoria</Text>
            <Text style={[styles.linhaCabecalhoTexto, styles.colValor]}>Valor</Text>
          </View>
          {itensDespesa.length === 0 && (
            <View style={styles.linha}>
              <Text>Nenhuma despesa nesta competência.</Text>
            </View>
          )}
          {itensDespesa.map((item) => (
            <View key={item.id} style={styles.linha}>
              <Text style={styles.colData}>{formatDatePtBR(item.lancamento.dataMovimento)}</Text>
              <Text style={styles.colDescricao}>
                {item.lancamento.descricao}
                {item.lancamento.fornecedor ? ` — ${item.lancamento.fornecedor.nome}` : ""}
              </Text>
              <Text style={styles.colCategoria}>{item.lancamento.categoria.nome}</Text>
              <Text style={[styles.colValor, { color: CORES.erro }]}>
                {formatCurrencyBRL(item.valorConsiderado)}
              </Text>
            </View>
          ))}
          <View style={styles.linhaTotal}>
            <Text style={styles.colLabel}>Total de despesas</Text>
            <Text style={[styles.colValor, { fontFamily: "Helvetica-Bold", color: CORES.erro }]}>
              {formatCurrencyBRL(prestacao.totalDespesas)}
            </Text>
          </View>
        </View>

        {prestacao.observacoes && (
          <>
            <Text style={styles.secaoTitulo}>Observações</Text>
            <Text style={{ color: CORES.cinza }}>{prestacao.observacoes}</Text>
          </>
        )}

        <View style={styles.rodape} fixed>
          <Text>
            Bem Viver Assessoria Condominial · bemviverassessoria.cond@gmail.com · (37) 99911-1336
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
