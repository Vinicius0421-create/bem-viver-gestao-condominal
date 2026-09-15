import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { competenciaLabel } from "@/lib/utils";
import { PrestacaoContasDocument } from "@/lib/pdf/prestacao-contas-document";

// Carregamento compartilhado entre a rota de download (`/api/prestacoes/[id]/pdf`)
// e o envio automático por e-mail ao síndico (Server Action), para nunca
// duplicar a query nem o mapeamento de dados do PDF em dois lugares que
// poderiam divergir com o tempo. Inclui o síndico do condomínio porque o
// envio por e-mail precisa do endereço de destino — a rota de download
// simplesmente ignora esse campo extra.
export async function carregarPrestacaoParaPdf(id: string) {
  return prisma.prestacaoContas.findUnique({
    where: { id },
    include: {
      condominio: { include: { sindico: true } },
      itens: {
        include: { lancamento: { include: { categoria: true, fornecedor: true } } },
        orderBy: { lancamento: { dataMovimento: "asc" } },
      },
    },
  });
}

export type PrestacaoParaPdf = NonNullable<Awaited<ReturnType<typeof carregarPrestacaoParaPdf>>>;

export async function gerarBufferPdfPrestacao(prestacao: PrestacaoParaPdf): Promise<Buffer> {
  return renderToBuffer(
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
}

export function nomeArquivoPdfPrestacao(prestacao: PrestacaoParaPdf): string {
  return `prestacao-contas-${prestacao.condominio.nome.replace(/[^a-zA-Z0-9]+/g, "-")}-${competenciaLabel(prestacao.competenciaMes, prestacao.competenciaAno).replace("/", "-")}.pdf`;
}
