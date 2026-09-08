"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { AssembleiaSchema } from "@/lib/validations/assembleia";
import {
  validarArquivoDocumento,
  enviarArquivoDocumento,
  removerArquivoDocumento,
} from "@/lib/storage";
import type { ActionState } from "@/app/actions/condominios";
import type { StatusAssembleia } from "@/generated/prisma/enums";

function toNullable(value: string | undefined | null) {
  return value && value.length > 0 ? value : null;
}

function paraDataHora(valor: string): Date | null {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

// Assembleias e atas (Sprint 7). Segue o mesmo padrão de upload opcional e
// substituível já usado em Contrato (Sprint 5) — a ata pode ser anexada na
// criação (quando já se sabe que a assembleia aconteceu) ou depois, na
// edição. Diferença de negócio própria deste módulo: anexar a ata a uma
// assembleia que ainda estava "Agendada" a marca automaticamente como
// "Realizada" — ter a ata assinada em mãos é, na prática, a prova de que a
// reunião aconteceu, então pedir esse status manualmente ao usuário além
// do upload seria um passo redundante. Esse é o único efeito colateral
// automático do formulário; as demais transições de status são explícitas,
// via `atualizarStatusAssembleia`.
export async function salvarAssembleia(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const id = formData.get("id")?.toString();

  const parsed = AssembleiaSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const condominio = await prisma.condominio.findUnique({ where: { id: data.condominioId } });
  if (!condominio) {
    return { success: false, error: "Condomínio não encontrado." };
  }

  const dataHora = paraDataHora(data.dataHora);
  if (!dataHora) {
    return { success: false, error: "Data e horário inválidos." };
  }

  let assembleiaAnterior: { arquivoUrl: string | null; status: StatusAssembleia } | null = null;
  if (id) {
    assembleiaAnterior = await prisma.assembleia.findUnique({
      where: { id },
      select: { arquivoUrl: true, status: true },
    });
    if (!assembleiaAnterior) return { success: false, error: "Assembleia não encontrada." };
  }

  // Upload da ata é opcional — nem toda assembleia tem, no momento do
  // cadastro, uma cópia digitalizada da ata assinada.
  const arquivo = formData.get("arquivo");
  let uploadArquivo: Awaited<ReturnType<typeof enviarArquivoDocumento>> | null = null;
  if (arquivo instanceof File && arquivo.size > 0) {
    const validacao = validarArquivoDocumento(arquivo);
    if (!validacao.ok) {
      return { success: false, error: validacao.erro };
    }
    try {
      uploadArquivo = await enviarArquivoDocumento({
        arquivo,
        condominioId: data.condominioId,
        pastaBase: "assembleias",
      });
    } catch (error) {
      console.error("Falha ao enviar a ata para o bucket:", error);
      return {
        success: false,
        error: "Não foi possível enviar o arquivo agora. Tente novamente em instantes.",
      };
    }
  }

  const payload = {
    condominioId: data.condominioId,
    tipo: data.tipo,
    dataHora,
    local: toNullable(data.local),
    pauta: data.pauta,
    observacoes: toNullable(data.observacoes),
    ...(uploadArquivo
      ? {
          arquivoUrl: uploadArquivo.chave,
          arquivoNome: uploadArquivo.nomeOriginal,
          arquivoTipo: uploadArquivo.tipo,
          tamanhoBytes: uploadArquivo.tamanhoBytes,
          // Ver nota da função: anexar a ata equivale, na prática, a
          // confirmar que a assembleia aconteceu.
          ...(assembleiaAnterior?.status === "AGENDADA" || !assembleiaAnterior
            ? { status: "REALIZADA" as const }
            : {}),
        }
      : {}),
  };

  if (id) {
    await prisma.assembleia.update({ where: { id }, data: payload });
    await registrarAuditoria({
      usuarioId: session.userId,
      acao: "ATUALIZACAO",
      entidade: "Assembleia",
      entidadeId: id,
      dadosDepois: { ...payload, arquivoUrl: undefined },
    });
    if (uploadArquivo && assembleiaAnterior?.arquivoUrl) {
      await removerArquivoDocumento(assembleiaAnterior.arquivoUrl);
    }
  } else {
    const criada = await prisma.assembleia.create({ data: payload });
    await registrarAuditoria({
      usuarioId: session.userId,
      acao: "CRIACAO",
      entidade: "Assembleia",
      entidadeId: criada.id,
      dadosDepois: { ...payload, arquivoUrl: undefined },
    });
  }

  revalidatePath("/dashboard/assembleias");
  revalidatePath(`/dashboard/condominios/${data.condominioId}`);
  return { success: true };
}

const TRANSICOES_VALIDAS: Record<StatusAssembleia, StatusAssembleia[]> = {
  AGENDADA: ["REALIZADA", "CANCELADA"],
  REALIZADA: ["AGENDADA"],
  CANCELADA: ["AGENDADA"],
};

// Mudança de status é uma ação administrativa (mesmo nível de
// publicar/reabrir prestação de contas) porque reescreve o registro
// oficial de que uma assembleia aconteceu ou não — reversível, mas
// auditada nos dois sentidos, como todo o resto do sistema (UX-1).
export async function atualizarStatusAssembleia(
  id: string,
  novoStatus: StatusAssembleia,
  condominioId: string
) {
  const session = await requireRole("ADMIN");
  const assembleia = await prisma.assembleia.findUnique({ where: { id } });
  if (!assembleia) throw new Error("Assembleia não encontrada.");

  const permitido = TRANSICOES_VALIDAS[assembleia.status]?.includes(novoStatus);
  if (!permitido) {
    throw new Error(`Não é possível mudar de "${assembleia.status}" para "${novoStatus}".`);
  }

  await prisma.assembleia.update({ where: { id }, data: { status: novoStatus } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "ATUALIZACAO",
    entidade: "Assembleia",
    entidadeId: id,
    dadosAntes: { status: assembleia.status },
    dadosDepois: { status: novoStatus },
  });

  revalidatePath("/dashboard/assembleias");
  revalidatePath(`/dashboard/condominios/${condominioId}`);
}
