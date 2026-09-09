"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { DocumentoSchema } from "@/lib/validations/documento";
import {
  validarArquivoDocumento,
  enviarArquivoDocumento,
  removerArquivoDocumento,
} from "@/lib/storage";
import type { ActionState } from "@/app/actions/condominios";

function toNullable(value: string | undefined | null) {
  return value && value.length > 0 ? value : null;
}

// "água, boleto,  junho" → ["água", "boleto", "junho"] — trim, remove
// vazios e duplicadas. Guardado como String[] nativo do Postgres.
function parseTags(value: string | undefined | null): string[] {
  if (!value) return [];
  const vistas = new Set<string>();
  for (const parte of value.split(",")) {
    const tag = parte.trim();
    if (tag) vistas.add(tag);
  }
  return Array.from(vistas);
}

// Central de Documentos (Sprint 4). Diferente do padrão "salvar único" usado
// em outros cadastros, upload de arquivo só faz sentido na criação — editar
// um documento existente só altera metadados (nome, descrição, categoria,
// validade). Para substituir o arquivo em si, o usuário envia um novo
// documento e exclui o antigo; simplifica a ação e evita objetos órfãos no
// bucket em caso de erro no meio de uma "substituição".
export async function enviarDocumento(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");

  const parsed = DocumentoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const condominio = await prisma.condominio.findUnique({ where: { id: data.condominioId } });
  if (!condominio) {
    return { success: false, error: "Condomínio não encontrado." };
  }

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File)) {
    return { success: false, error: "Selecione um arquivo." };
  }
  const validacao = validarArquivoDocumento(arquivo);
  if (!validacao.ok) {
    return { success: false, error: validacao.erro };
  }

  let upload: Awaited<ReturnType<typeof enviarArquivoDocumento>>;
  try {
    upload = await enviarArquivoDocumento({ arquivo, condominioId: data.condominioId });
  } catch (error) {
    console.error("Falha ao enviar documento para o bucket:", error);
    return {
      success: false,
      error: "Não foi possível enviar o arquivo agora. Tente novamente em instantes.",
    };
  }

  const dataValidade = toNullable(data.dataValidade) ? new Date(data.dataValidade!) : null;
  if (dataValidade && Number.isNaN(dataValidade.getTime())) {
    return { success: false, error: "Data de validade inválida." };
  }
  if (data.competenciaMes && !data.competenciaAno) {
    return { success: false, error: "Informe também o ano de competência." };
  }

  let criado;
  try {
    criado = await prisma.documento.create({
      data: {
        condominioId: data.condominioId,
        nome: data.nome,
        descricao: toNullable(data.descricao),
        categoriaId: data.categoriaId,
        competenciaMes: data.competenciaMes || null,
        competenciaAno: data.competenciaAno || null,
        fornecedorId: toNullable(data.fornecedorId),
        unidadeId: toNullable(data.unidadeId),
        tags: parseTags(data.tags),
        arquivoUrl: upload.chave,
        arquivoNome: upload.nomeOriginal,
        arquivoTipo: upload.tipo,
        tamanhoBytes: upload.tamanhoBytes,
        hashArquivo: upload.hashSha256,
        dataValidade,
        enviadoPorId: session.userId,
      },
    });
  } catch {
    return { success: false, error: "Fornecedor ou unidade selecionados são inválidos." };
  }

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "CRIACAO",
    entidade: "Documento",
    entidadeId: criado.id,
    dadosDepois: {
      condominioId: data.condominioId,
      nome: data.nome,
      categoriaId: data.categoriaId,
      fornecedorId: criado.fornecedorId,
      unidadeId: criado.unidadeId,
      arquivoNome: upload.nomeOriginal,
    },
  });

  revalidatePath("/dashboard/documentos");
  revalidatePath(`/dashboard/condominios/${data.condominioId}`);
  return { success: true };
}

export async function editarMetadadosDocumento(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const id = formData.get("id")?.toString();
  if (!id) return { success: false, error: "Documento não identificado." };

  const parsed = DocumentoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const atual = await prisma.documento.findUnique({ where: { id } });
  if (!atual || atual.excluidoEm) {
    return { success: false, error: "Documento não encontrado." };
  }

  const dataValidade = toNullable(data.dataValidade) ? new Date(data.dataValidade!) : null;
  if (dataValidade && Number.isNaN(dataValidade.getTime())) {
    return { success: false, error: "Data de validade inválida." };
  }
  if (data.competenciaMes && !data.competenciaAno) {
    return { success: false, error: "Informe também o ano de competência." };
  }

  const payload = {
    nome: data.nome,
    descricao: toNullable(data.descricao),
    categoriaId: data.categoriaId,
    competenciaMes: data.competenciaMes || null,
    competenciaAno: data.competenciaAno || null,
    fornecedorId: toNullable(data.fornecedorId),
    unidadeId: toNullable(data.unidadeId),
    tags: parseTags(data.tags),
    dataValidade,
  };

  try {
    await prisma.documento.update({ where: { id }, data: payload });
  } catch {
    return { success: false, error: "Fornecedor ou unidade selecionados são inválidos." };
  }
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "ATUALIZACAO",
    entidade: "Documento",
    entidadeId: id,
    dadosAntes: {
      nome: atual.nome,
      categoriaId: atual.categoriaId,
      fornecedorId: atual.fornecedorId,
      unidadeId: atual.unidadeId,
      dataValidade: atual.dataValidade,
    },
    dadosDepois: payload,
  });

  revalidatePath("/dashboard/documentos");
  if (atual.condominioId) revalidatePath(`/dashboard/condominios/${atual.condominioId}`);
  return { success: true };
}

export async function excluirDocumento(id: string) {
  const session = await requireRole("GESTOR");

  const documento = await prisma.documento.findUnique({ where: { id } });
  if (!documento || documento.excluidoEm) {
    throw new Error("Documento não encontrado.");
  }

  // Exclusão lógica primeiro — é a garantia que importa (o registro some da
  // listagem e não pode mais ser baixado). A remoção do objeto físico no
  // bucket é best-effort e não deve travar a operação para o usuário.
  await prisma.documento.update({ where: { id }, data: { excluidoEm: new Date() } });
  await removerArquivoDocumento(documento.arquivoUrl);
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "EXCLUSAO",
    entidade: "Documento",
    entidadeId: id,
    dadosAntes: { nome: documento.nome, arquivoNome: documento.arquivoNome },
  });

  revalidatePath("/dashboard/documentos");
  if (documento.condominioId) revalidatePath(`/dashboard/condominios/${documento.condominioId}`);
}
