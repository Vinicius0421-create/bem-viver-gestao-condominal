import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { gerarUrlDownloadDocumento } from "@/lib/storage";

// Mesmo padrão de download mediado usado em /api/documentos/[id]/download
// e /api/contratos/[id]/download: o bucket é privado, então nunca expomos
// a chave do objeto (`Assembleia.arquivoUrl`) diretamente — apenas uma URL
// assinada de curta duração gerada sob demanda, após confirmar sessão
// válida.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await verifySession();
  const { id } = await params;

  const assembleia = await prisma.assembleia.findUnique({ where: { id } });
  if (!assembleia || !assembleia.arquivoUrl) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  try {
    const url = await gerarUrlDownloadDocumento(assembleia.arquivoUrl);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Falha ao gerar URL de download da ata:", error);
    return NextResponse.json(
      { error: "Não foi possível baixar o arquivo agora. Tente novamente em instantes." },
      { status: 502 }
    );
  }
}
