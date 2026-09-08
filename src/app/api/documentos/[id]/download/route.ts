import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { gerarUrlDownloadDocumento } from "@/lib/storage";

// Central de Documentos (Sprint 4) — o bucket é privado (Railway Buckets não
// suportam bucket público), então todo download é mediado por esta rota:
// confirma sessão válida, confirma que o documento não foi excluído e só
// então gera uma URL assinada de curta duração (5 minutos) para o objeto
// real no bucket, redirecionando o navegador para ela. A chave do objeto
// (`Documento.arquivoUrl`) nunca é exposta diretamente ao cliente.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await verifySession();
  const { id } = await params;

  const documento = await prisma.documento.findUnique({ where: { id } });
  if (!documento || documento.excluidoEm) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }

  try {
    const url = await gerarUrlDownloadDocumento(documento.arquivoUrl);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Falha ao gerar URL de download do documento:", error);
    return NextResponse.json(
      { error: "Não foi possível baixar o arquivo agora. Tente novamente em instantes." },
      { status: 502 }
    );
  }
}
