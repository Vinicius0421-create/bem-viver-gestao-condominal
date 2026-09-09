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
  // "nenhuma" é o valor sentinela usado pelo <Select> (Radix não aceita
  // value="" em SelectItem) para representar "sem categoria-mãe".
  const categoriaPaiId =
    data.categoriaPaiId && data.categoriaPaiId !== "nenhuma" ? data.categoriaPaiId : null;

  // Mesma regra de hierarquia de 1 nível só, já validada em
  // actions/categorias.ts (CategoriaFinanceira) — ver lá o racional
  // completo.
  if (categoriaPaiId) {
    if (categoriaPaiId === id) {
      return { success: false, error: "Uma categoria não pode ser subcategoria de si mesma." };
    }
    const pai = await prisma.categoriaDocumento.findUnique({ where: { id: categoriaPaiId } });
    if (!pai) {
      return { success: false, error: "Categoria-mãe selecionada não existe." };
    }
    if (pai.categoriaPaiId) {
      return {
        success: false,
        error: "Só é permitido um nível de subcategoria — selecione uma categoria principal como mãe.",
      };
    }
  }
  if (id && categoriaPaiId) {
    const temFilhas = await prisma.categoriaDocumento.count({ where: { categoriaPaiId: id } });
    if (temFilhas > 0) {
      return {
        success: false,
        error: "Esta categoria já tem subcategorias — não pode virar subcategoria de outra.",
      };
    }
  }

  const payload = {
    nome: data.nome,
    cor: data.cor || "#b3892f",
    ordem: data.ordem ?? 0,
    categoriaPaiId,
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
