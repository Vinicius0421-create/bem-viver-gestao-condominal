import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, papelAtendeMinimo } from "@/lib/dal";
import { competenciaLabel } from "@/lib/utils";
import { gerarExcelPrestacaoContas } from "@/lib/excel/prestacao-contas-excel";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // SEG-9: mesma correção aplicada à rota de PDF — checagem explícita de
  // papel mínimo além da sessão válida (ver comentário em pdf/route.ts).
  const session = await verifySession();
  if (!papelAtendeMinimo(session.papel, "OPERACIONAL")) {
    return NextResponse.json(
      { error: "Ação não permitida para o seu perfil de acesso." },
      { status: 403 }
    );
  }
  const { id } = await params;

  const prestacao = await prisma.prestacaoContas.findUnique({
    where: { id },
    include: {
      condominio: true,
      itens: {
        include: { lancamento: { include: { categoria: true, fornecedor: true } } },
        orderBy: { lancamento: { dataMovimento: "asc" } },
      },
    },
  });
  if (!prestacao) {
    return NextResponse.json({ error: "Prestação de contas não encontrada." }, { status: 404 });
  }

  const buffer = await gerarExcelPrestacaoContas({
    competenciaMes: prestacao.competenciaMes,
    competenciaAno: prestacao.competenciaAno,
    saldoAnterior: prestacao.saldoAnterior.toString(),
    totalReceitas: prestacao.totalReceitas.toString(),
    totalDespesas: prestacao.totalDespesas.toString(),
    saldoAtual: prestacao.saldoAtual.toString(),
    status: prestacao.status,
    condominio: { nome: prestacao.condominio.nome },
    itens: prestacao.itens.map((item) => ({
      valorConsiderado: item.valorConsiderado.toString(),
      lancamento: {
        tipo: item.lancamento.tipo,
        dataMovimento: item.lancamento.dataMovimento,
        descricao: item.lancamento.descricao,
        categoria: { nome: item.lancamento.categoria.nome },
        fornecedor: item.lancamento.fornecedor
          ? { nome: item.lancamento.fornecedor.nome }
          : null,
      },
    })),
  });

  const nomeArquivo = `prestacao-contas-${prestacao.condominio.nome.replace(/[^a-zA-Z0-9]+/g, "-")}-${competenciaLabel(prestacao.competenciaMes, prestacao.competenciaAno).replace("/", "-")}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
