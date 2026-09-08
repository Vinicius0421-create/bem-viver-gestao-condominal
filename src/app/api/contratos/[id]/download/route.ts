import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { gerarUrlDownloadDocumento } from "@/lib/storage";

// Mesmo padrão de download mediado usado em /api/documentos/[id]/download
// (Sprint 4): o bucket é privado, então nunca expomos a chave do objeto
// (`Contrato.arquivoUrl`) diretamente — apenas uma URL assinada de curta
// duração gerada sob demanda, após confirmar sessão válida.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await verifySession();
  const { id } = await params;

  const contrato = await prisma.contrato.findUnique({ where: { id } });
  if (!contrato || !contrato.arquivoUrl) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  try {
    const url = await gerarUrlDownloadDocumento(contrato.arquivoUrl);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Falha ao gerar URL de download do contrato:", error);
    return NextResponse.json(
      { error: "Não foi possível baixar o arquivo agora. Tente novamente em instantes." },
      { status: 502 }
    );
  }
}
