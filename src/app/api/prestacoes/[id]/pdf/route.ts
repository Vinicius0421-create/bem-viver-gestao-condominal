import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { competenciaLabel } from "@/lib/utils";
import { PrestacaoContasDocument } from "@/lib/pdf/prestacao-contas-document";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await verifySession();
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

  const buffer = await renderToBuffer(
    PrestacaoContasDocument({
      prestacao: {
        id: prestacao.id,
        competenciaMes: prestacao.competenciaMes,
        competenciaAno: prestacao.competenciaAno,
        saldoAnterior: prestacao.saldoAnterior.toString(),
        totalReceitas: prestacao.totalReceitas.toString(),
        totalDespesas: prestacao.totalDespesas.toString(),
        saldoAtual: prestacao.saldoAtual.toString(),
        status: prestacao.status,
        publicadoEm: prestacao.publicadoEm,
        observacoes: prestacao.observacoes,
        condominio: {
          nome: prestacao.condominio.nome,
          cnpj: prestacao.condominio.cnpj,
          endereco: prestacao.condominio.endereco,
        },
        itens: prestacao.itens.map((item) => ({
          id: item.id,
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
      },
    })
  );

  const nomeArquivo = `prestacao-contas-${prestacao.condominio.nome.replace(/[^a-zA-Z0-9]+/g, "-")}-${competenciaLabel(prestacao.competenciaMes, prestacao.competenciaAno).replace("/", "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
