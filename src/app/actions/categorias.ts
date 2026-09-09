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
  // "nenhuma" é o valor sentinela usado pelo <Select> (Radix não aceita
  // value="" em SelectItem) para representar "sem categoria-mãe".
  const categoriaPaiId =
    data.categoriaPaiId && data.categoriaPaiId !== "nenhuma" ? data.categoriaPaiId : null;

  // Hierarquia de 1 nível só: a categoria-mãe escolhida precisa existir,
  // ter o mesmo tipo (receita/despesa) e não pode ser ela mesma uma
  // subcategoria — evita criar uma cadeia de 3+ níveis, que não tem
  // representação na UI (lista simples de categorias + subcategorias).
  if (categoriaPaiId) {
    if (categoriaPaiId === id) {
      return { success: false, error: "Uma categoria não pode ser subcategoria de si mesma." };
    }
    const pai = await prisma.categoriaFinanceira.findUnique({ where: { id: categoriaPaiId } });
    if (!pai) {
      return { success: false, error: "Categoria-mãe selecionada não existe." };
    }
    if (pai.categoriaPaiId) {
      return {
        success: false,
        error: "Só é permitido um nível de subcategoria — selecione uma categoria principal como mãe.",
      };
    }
    if (pai.tipo !== data.tipo) {
      return {
        success: false,
        error: "A subcategoria precisa ser do mesmo tipo (receita/despesa) da categoria-mãe.",
      };
    }
  }

  // Uma categoria que já tem subcategorias não pode virar subcategoria de
  // outra — evitaria "orfanizar" a hierarquia dela.
  if (id && categoriaPaiId) {
    const temFilhas = await prisma.categoriaFinanceira.count({ where: { categoriaPaiId: id } });
    if (temFilhas > 0) {
      return {
        success: false,
        error: "Esta categoria já tem subcategorias — não pode virar subcategoria de outra.",
      };
    }
  }

  const payload = {
    nome: data.nome,
    tipo: data.tipo,
    natureza: data.natureza,
    cor: data.cor || "#C9A227",
    ordem: data.ordem ?? 0,
    categoriaPaiId,
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
