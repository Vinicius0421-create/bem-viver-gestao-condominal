import "server-only";
import { prisma } from "@/lib/prisma";
import type { AcaoAuditoria } from "@/generated/prisma/enums";

type RegistrarAuditoriaInput = {
  usuarioId?: string | null;
  acao: AcaoAuditoria;
  entidade: string;
  entidadeId?: string | null;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
};

// Registro de auditoria "fire and forget" — nunca deve derrubar a operação
// principal caso falhe (ex: log é best-effort, não é fonte de verdade
// transacional). Erros são apenas registrados no console do servidor.
export async function registrarAuditoria(input: RegistrarAuditoriaInput) {
  try {
    await prisma.logAuditoria.create({
      data: {
        usuarioId: input.usuarioId ?? null,
        acao: input.acao,
        entidade: input.entidade,
        entidadeId: input.entidadeId ?? null,
        dadosAntes: input.dadosAntes ? JSON.parse(JSON.stringify(input.dadosAntes)) : undefined,
        dadosDepois: input.dadosDepois ? JSON.parse(JSON.stringify(input.dadosDepois)) : undefined,
      },
    });
  } catch (error) {
    console.error("Falha ao registrar log de auditoria:", error);
  }
}
