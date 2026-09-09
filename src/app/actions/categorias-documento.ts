"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { CategoriaDocumentoSchema } from "@/lib/validations/categoria-documento";
import type { ActionState } from "@/app/actions/condominios";

export async function salvarCategoriaDocumento(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const id = formData.get("id")?.toString();
  const parsed = CategoriaDocumentoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const payload = {
    nome: data.nome,
    cor: data.cor || "#b3892f",
    ordem: data.ordem ?? 0,
  };

  try {
    if (id) {
      await prisma.categoriaDocumento.update({ where: { id }, data: payload });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "ATUALIZACAO",
        entidade: "CategoriaDocumento",
        entidadeId: id,
        dadosDepois: payload,
      });
    } else {
      const criada = await prisma.categoriaDocumento.create({ data: payload });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "CRIACAO",
        entidade: "CategoriaDocumento",
        entidadeId: criada.id,
        dadosDepois: payload,
      });
    }
  } catch {
    return { success: false, error: "Já existe uma categoria de documento com esse nome." };
  }

  revalidatePath("/dashboard/configuracoes/categorias");
  return { success: true };
}

// Mesma proteção usada em CategoriaFinanceira: categorias padrão do sistema
// (as 7 herdadas do enum original) não podem ser desativadas — evita que um
// documento antigo fique com uma categoria "órfã" nos filtros/relatórios.
export async function inativarCategoriaDocumento(id: string) {
  const session = await requireRole("ADMIN");
  const categoria = await prisma.categoriaDocumento.findUnique({ where: { id } });
  if (categoria?.padraoSistema) {
    throw new Error("Categorias padrão do sistema não podem ser removidas.");
  }
  await prisma.categoriaDocumento.update({ where: { id }, data: { ativo: false } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "EXCLUSAO",
    entidade: "CategoriaDocumento",
    entidadeId: id,
  });
  revalidatePath("/dashboard/configuracoes/categorias");
}
