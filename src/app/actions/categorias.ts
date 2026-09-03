"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { CategoriaFinanceiraSchema } from "@/lib/validations/cadastros";
import type { ActionState } from "@/app/actions/condominios";

export async function salvarCategoria(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const id = formData.get("id")?.toString();
  const parsed = CategoriaFinanceiraSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const payload = {
    nome: data.nome,
    tipo: data.tipo,
    natureza: data.natureza,
    cor: data.cor || "#C9A227",
  };

  try {
    if (id) {
      await prisma.categoriaFinanceira.update({ where: { id }, data: payload });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "ATUALIZACAO",
        entidade: "CategoriaFinanceira",
        entidadeId: id,
        dadosDepois: payload,
      });
    } else {
      const criada = await prisma.categoriaFinanceira.create({ data: payload });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "CRIACAO",
        entidade: "CategoriaFinanceira",
        entidadeId: criada.id,
        dadosDepois: payload,
      });
    }
  } catch {
    return { success: false, error: "Já existe uma categoria com esse nome e tipo." };
  }

  revalidatePath("/dashboard/configuracoes/categorias");
  return { success: true };
}

export async function inativarCategoria(id: string) {
  const session = await requireRole("ADMIN");
  const categoria = await prisma.categoriaFinanceira.findUnique({ where: { id } });
  if (categoria?.padraoSistema) {
    throw new Error("Categorias padrão do sistema não podem ser removidas.");
  }
  await prisma.categoriaFinanceira.update({ where: { id }, data: { ativo: false } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "EXCLUSAO",
    entidade: "CategoriaFinanceira",
    entidadeId: id,
  });
  revalidatePath("/dashboard/configuracoes/categorias");
}
