"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { UsuarioSchema } from "@/lib/validations/cadastros";
import type { ActionState } from "@/app/actions/condominios";

export async function salvarUsuario(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const id = formData.get("id")?.toString();
  const parsed = UsuarioSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  if (!id && !data.senha) {
    return { success: false, error: "Defina uma senha provisória para o novo usuário." };
  }

  try {
    if (id) {
      await prisma.usuario.update({
        where: { id },
        data: {
          nome: data.nome,
          email: data.email.toLowerCase(),
          papel: data.papel,
          ...(data.senha ? { senhaHash: await hashPassword(data.senha) } : {}),
        },
      });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "ATUALIZACAO",
        entidade: "Usuario",
        entidadeId: id,
        dadosDepois: { nome: data.nome, email: data.email, papel: data.papel },
      });
    } else {
      const criado = await prisma.usuario.create({
        data: {
          nome: data.nome,
          email: data.email.toLowerCase(),
          papel: data.papel,
          senhaHash: await hashPassword(data.senha as string),
        },
      });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "CRIACAO",
        entidade: "Usuario",
        entidadeId: criado.id,
        dadosDepois: { nome: data.nome, email: data.email, papel: data.papel },
      });
    }
  } catch {
    return { success: false, error: "Já existe um usuário com esse e-mail." };
  }

  revalidatePath("/dashboard/configuracoes/usuarios");
  return { success: true };
}

export async function alternarAtivoUsuario(id: string, ativo: boolean) {
  const session = await requireRole("ADMIN");
  if (id === session.userId && !ativo) {
    throw new Error("Você não pode desativar seu próprio usuário.");
  }
  await prisma.usuario.update({ where: { id }, data: { ativo } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "ATUALIZACAO",
    entidade: "Usuario",
    entidadeId: id,
    dadosDepois: { ativo },
  });
  revalidatePath("/dashboard/configuracoes/usuarios");
}
