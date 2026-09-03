import ExcelJS from "exceljs";
import { competenciaLabel, formatDatePtBR } from "@/lib/utils";

const COR_PRETO = "FF171310";
const COR_DOURADO = "FFB3892F";
const COR_DOURADO_CLARO = "FFF5ECC9";
const COR_SUCESSO = "FF1F7A4D";
const COR_ERRO = "FFB3261E";

type ItemExcel = {
  valorConsiderado: string;
  lancamento: {
    tipo: "RECEITA" | "DESPESA";
    dataMovimento: Date;
    descricao: string;
    categoria: { nome: string };
    fornecedor: { nome: string } | null;
  };
};

export type PrestacaoContasExcelData = {
  competenciaMes: number;
  competenciaAno: number;
  saldoAnterior: string;
  totalReceitas: string;
  totalDespesas: string;
  saldoAtual: string;
  status: string;
  condominio: { nome: string };
  itens: ItemExcel[];
};

function estilizarCabecalhoTabela(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_PRETO } };
    cell.font = { color: { argb: COR_DOURADO_CLARO }, bold: true, size: 10 };
    cell.alignment = { vertical: "middle" };
  });
}

export async function gerarExcelPrestacaoContas(
  prestacao: PrestacaoContasExcelData
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bem Viver Assessoria Condominial";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Prestação de Contas", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
  });
  sheet.columns = [
    { width: 4 },
    { width: 14 },
    { width: 40 },
    { width: 22 },
    { width: 16 },
  ];

  // Cabeçalho institucional
  sheet.mergeCells("B2:E2");
  const titulo = sheet.getCell("B2");
  titulo.value = "BEM VIVER ASSESSORIA CONDOMINIAL";
  titulo.font = { bold: true, size: 14, color: { argb: COR_PRETO } };

  sheet.mergeCells("B3:E3");
  const subtitulo = sheet.getCell("B3");
  subtitulo.value = `Prestação de Contas — ${prestacao.condominio.nome}`;
  subtitulo.font = { size: 11, color: { argb: COR_DOURADO } };

  sheet.mergeCells("B4:E4");
  const competencia = sheet.getCell("B4");
  competencia.value = `Competência: ${competenciaLabel(prestacao.competenciaMes, prestacao.competenciaAno)}  ·  Status: ${prestacao.status}`;
  competencia.font = { size: 9.5, color: { argb: "FF6B6656" }, italic: true };

  sheet.getRow(2).height = 22;

  // Resumo financeiro
  let linhaAtual = 6;
  const resumo: [string, number, string][] = [
    ["Saldo anterior", Number(prestacao.saldoAnterior), COR_PRETO],
    ["Total de receitas", Number(prestacao.totalReceitas), COR_SUCESSO],
    ["Total de despesas", Number(prestacao.totalDespesas), COR_ERRO],
    ["Saldo atual", Number(prestacao.saldoAtual), COR_DOURADO],
  ];
  resumo.forEach(([label, valor, cor]) => {
    const rotuloCell = sheet.getCell(`B${linhaAtual}`);
    rotuloCell.value = label;
    rotuloCell.font = { bold: true, size: 10 };

    const valorCell = sheet.getCell(`C${linhaAtual}`);
    valorCell.value = valor;
    valorCell.numFmt = '"R$" #,##0.00';
    valorCell.font = { bold: true, size: 10, color: { argb: cor } };
    linhaAtual += 1;
  });

  linhaAtual += 1;

  function escreverTabela(tituloSecao: string, itens: ItemExcel[], cor: string) {
    sheet.mergeCells(`B${linhaAtual}:E${linhaAtual}`);
    const tituloCell = sheet.getCell(`B${linhaAtual}`);
    tituloCell.value = `${tituloSecao} (${itens.length})`;
    tituloCell.font = { bold: true, size: 11, color: { argb: cor } };
    linhaAtual += 1;

    const linhaCabecalho = sheet.getRow(linhaAtual);
    linhaCabecalho.getCell(2).value = "Data";
    linhaCabecalho.getCell(3).value = "Descrição";
    linhaCabecalho.getCell(4).value = "Categoria";
    linhaCabecalho.getCell(5).value = "Valor (R$)";
    estilizarCabecalhoTabela(linhaCabecalho);
    linhaAtual += 1;

    if (itens.length === 0) {
      sheet.mergeCells(`B${linhaAtual}:E${linhaAtual}`);
      sheet.getCell(`B${linhaAtual}`).value = "Nenhum lançamento nesta competência.";
      sheet.getCell(`B${linhaAtual}`).font = { italic: true, color: { argb: "FF6B6656" } };
      linhaAtual += 1;
    }

    let totalSecao = 0;
    itens.forEach((item) => {
      const row = sheet.getRow(linhaAtual);
      row.getCell(2).value = formatDatePtBR(item.lancamento.dataMovimento);
      row.getCell(3).value =
        item.lancamento.descricao +
        (item.lancamento.fornecedor ? ` — ${item.lancamento.fornecedor.nome}` : "");
      row.getCell(4).value = item.lancamento.categoria.nome;
      const valorCell = row.getCell(5);
      valorCell.value = Number(item.valorConsiderado);
      valorCell.numFmt = '"R$" #,##0.00';
      valorCell.font = { color: { argb: cor } };
      row.eachCell((cell) => {
        cell.border = { bottom: { style: "hair", color: { argb: "FFE7E2D6" } } };
      });
      totalSecao += Number(item.valorConsiderado);
      linhaAtual += 1;
    });

    const rowTotal = sheet.getRow(linhaAtual);
    rowTotal.getCell(3).value = `Total de ${tituloSecao.toLowerCase()}`;
    rowTotal.getCell(3).font = { bold: true };
    const totalCell = rowTotal.getCell(5);
    totalCell.value = totalSecao;
    totalCell.numFmt = '"R$" #,##0.00';
    totalCell.font = { bold: true, color: { argb: cor } };
    rowTotal.eachCell((cell) => {
      cell.border = { top: { style: "thin", color: { argb: COR_PRETO } } };
    });
    linhaAtual += 2;
  }

  const itensReceita = prestacao.itens.filter((i) => i.lancamento.tipo === "RECEITA");
  const itensDespesa = prestacao.itens.filter((i) => i.lancamento.tipo === "DESPESA");

  escreverTabela("Receitas", itensReceita, COR_SUCESSO);
  escreverTabela("Despesas", itensDespesa, COR_ERRO);

  sheet.mergeCells(`B${linhaAtual}:E${linhaAtual}`);
  const rodape = sheet.getCell(`B${linhaAtual}`);
  rodape.value = "Bem Viver Assessoria Condominial · bemviverassessoria.cond@gmail.com · (37) 99911-1336";
  rodape.font = { size: 8, italic: true, color: { argb: "FF6B6656" } };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
