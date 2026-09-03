"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { FornecedorSchema } from "@/lib/validations/cadastros";
import type { ActionState } from "@/app/actions/condominios";

function toNullable(v: string | undefined | null) {
  return v && v.length > 0 ? v : null;
}

export async function salvarFornecedor(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const id = formData.get("id")?.toString();
  const parsed = FornecedorSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const payload = {
    nome: data.nome,
    cnpjCpf: toNullable(data.cnpjCpf),
    categoria: toNullable(data.categoria),
    telefone: toNullable(data.telefone),
    email: toNullable(data.email),
    endereco: toNullable(data.endereco),
    observacoes: toNullable(data.observacoes),
  };

  if (id) {
    await prisma.fornecedor.update({ where: { id }, data: payload });
    await registrarAuditoria({
      usuarioId: session.userId,
      acao: "ATUALIZACAO",
      entidade: "Fornecedor",
      entidadeId: id,
      dadosDepois: payload,
    });
  } else {
    const criado = await prisma.fornecedor.create({ data: payload });
    await registrarAuditoria({
      usuarioId: session.userId,
      acao: "CRIACAO",
      entidade: "Fornecedor",
      entidadeId: criado.id,
      dadosDepois: payload,
    });
  }

  revalidatePath("/dashboard/fornecedores");
  return { success: true };
}

// UX-1: antes, só existia `inativarFornecedor` — uma via de mão única sem
// nenhum caminho de reversão pela interface (diferente do padrão já usado
// para Usuários, que tem `alternarAtivoUsuario`). Agora aceita os dois
// sentidos, mantendo o mesmo registro de auditoria em ambos os casos.
export async function alternarAtivoFornecedor(id: string, ativo: boolean) {
  const session = await requireRole("ADMIN");
  await prisma.fornecedor.update({ where: { id }, data: { ativo } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: ativo ? "ATUALIZACAO" : "EXCLUSAO",
    entidade: "Fornecedor",
    entidadeId: id,
    dadosDepois: { ativo },
  });
  revalidatePath("/dashboard/fornecedores");
}
