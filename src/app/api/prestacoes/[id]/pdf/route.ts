import { NextResponse } from "next/server";
import { verifySession, papelAtendeMinimo } from "@/lib/dal";
import {
  carregarPrestacaoParaPdf,
  gerarBufferPdfPrestacao,
  nomeArquivoPdfPrestacao,
} from "@/lib/pdf/prestacao-contas-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // SEG-9: antes, esta rota só confirmava que existia uma sessão válida
  // (`verifySession`), sem checar o papel do usuário — qualquer conta
  // autenticada, de qualquer nível, conseguia exportar qualquer prestação.
  // `verifySession()` continua responsável por redirecionar para /login
  // quando não há sessão (mantém o comportamento de navegação direta pelo
  // link); a checagem de papel mínimo (o mesmo OPERACIONAL exigido para
  // visualizar a prestação na tela) é feita explicitamente aqui, retornando
  // 403 em JSON — que é a resposta correta para este endpoint de API,
  // consumido tanto por navegação direta quanto por fetch().
  const session = await verifySession();
  if (!papelAtendeMinimo(session.papel, "OPERACIONAL")) {
    return NextResponse.json(
      { error: "Ação não permitida para o seu perfil de acesso." },
      { status: 403 }
    );
  }
  const { id } = await params;

  const prestacao = await carregarPrestacaoParaPdf(id);
  if (!prestacao) {
    return NextResponse.json({ error: "Prestação de contas não encontrada." }, { status: 404 });
  }

  const buffer = await gerarBufferPdfPrestacao(prestacao);
  const nomeArquivo = nomeArquivoPdfPrestacao(prestacao);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
