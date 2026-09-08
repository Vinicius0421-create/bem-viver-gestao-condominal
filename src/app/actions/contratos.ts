"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { ContratoSchema } from "@/lib/validations/contrato";
import {
  validarArquivoDocumento,
  enviarArquivoDocumento,
  removerArquivoDocumento,
} from "@/lib/storage";
import type { ActionState } from "@/app/actions/condominios";

function toNullable(value: string | undefined | null) {
  return value && value.length > 0 ? value : null;
}

function paraData(valor: string): Date | null {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

// Contratos com fornecedores/prestadores (Sprint 5). Diferente de
// Documento (upload só na criação), aqui a substituição do arquivo é
// permitida na edição — um contrato é um registro de longa duração (a
// relação com o fornecedor), não um item avulso de um repositório, então
// faz sentido anexar o aditivo/nova versão assinada ao mesmo registro em
// vez de criar um novo. O arquivo antigo é removido best-effort do bucket
// quando substituído.
export async function salvarContrato(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const id = formData.get("id")?.toString();

  const parsed = ContratoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const condominio = await prisma.condominio.findUnique({ where: { id: data.condominioId } });
  if (!condominio) {
    return { success: false, error: "Condomínio não encontrado." };
  }

  const dataInicio = paraData(data.dataInicio);
  if (!dataInicio) {
    return { success: false, error: "Data de início inválida." };
  }
  const dataFim = toNullable(data.dataFim) ? paraData(data.dataFim!) : null;
  if (toNullable(data.dataFim) && !dataFim) {
    return { success: false, error: "Data de fim inválida." };
  }
  if (dataFim && dataFim < dataInicio) {
    return { success: false, error: "A data de fim não pode ser anterior à data de início." };
  }

  let contratoAnterior: { arquivoUrl: string | null } | null = null;
  if (id) {
    contratoAnterior = await prisma.contrato.findUnique({
      where: { id },
      select: { arquivoUrl: true },
    });
    if (!contratoAnterior) return { success: false, error: "Contrato não encontrado." };
  }

  // Upload de arquivo é opcional em Contrato (diferente de Documento, onde
  // é obrigatório) — nem todo contrato tem uma cópia digitalizada ainda.
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
        pastaBase: "contratos",
      });
    } catch (error) {
      console.error("Falha ao enviar arquivo do contrato para o bucket:", error);
      return {
        success: false,
        error: "Não foi possível enviar o arquivo agora. Tente novamente em instantes.",
      };
    }
  }

  const payload = {
    condominioId: data.condominioId,
    fornecedorId: toNullable(data.fornecedorId),
    nome: data.nome,
    tipo: data.tipo,
    dataInicio,
    dataFim,
    valor: data.valor ?? null,
    periodicidade: toNullable(data.periodicidade),
    observacoes: toNullable(data.observacoes),
    ...(uploadArquivo
      ? {
          arquivoUrl: uploadArquivo.chave,
          arquivoNome: uploadArquivo.nomeOriginal,
          arquivoTipo: uploadArquivo.tipo,
          tamanhoBytes: uploadArquivo.tamanhoBytes,
        }
      : {}),
  };

  if (id) {
    await prisma.contrato.update({ where: { id }, data: payload });
    await registrarAuditoria({
      usuarioId: session.userId,
      acao: "ATUALIZACAO",
      entidade: "Contrato",
      entidadeId: id,
      dadosDepois: { ...payload, arquivoUrl: undefined },
    });
    // Só remove o arquivo antigo depois que o novo já foi salvo com
    // sucesso no banco — evita ficar sem arquivo nenhum se o upload
    // funcionar mas a atualização do registro falhar.
    if (uploadArquivo && contratoAnterior?.arquivoUrl) {
      await removerArquivoDocumento(contratoAnterior.arquivoUrl);
    }
  } else {
    const criado = await prisma.contrato.create({ data: payload });
    await registrarAuditoria({
      usuarioId: session.userId,
      acao: "CRIACAO",
      entidade: "Contrato",
      entidadeId: criado.id,
      dadosDepois: { ...payload, arquivoUrl: undefined },
    });
  }

  revalidatePath("/dashboard/contratos");
  revalidatePath(`/dashboard/condominios/${data.condominioId}`);
  return { success: true };
}

// Mesmo padrão reversível já usado em Fornecedor/Síndico (UX-1) — inativar
// um contrato (encerrado, cancelado, não renovado) não é o mesmo que
// excluir o registro, e precisa poder ser desfeito pela interface.
export async function alternarAtivoContrato(id: string, ativo: boolean) {
  const session = await requireRole("ADMIN");
  const contrato = await prisma.contrato.findUnique({ where: { id } });
  if (!contrato) throw new Error("Contrato não encontrado.");

  await prisma.contrato.update({ where: { id }, data: { ativo } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: ativo ? "ATUALIZACAO" : "EXCLUSAO",
    entidade: "Contrato",
    entidadeId: id,
    dadosDepois: { ativo },
  });

  revalidatePath("/dashboard/contratos");
  revalidatePath(`/dashboard/condominios/${contrato.condominioId}`);
}
