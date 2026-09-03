"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { SindicoSchema } from "@/lib/validations/cadastros";
import type { ActionState } from "@/app/actions/condominios";

function toNullable(v: string | undefined | null) {
  return v && v.length > 0 ? v : null;
}

export async function salvarSindico(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const id = formData.get("id")?.toString();
  const parsed = SindicoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const payload = {
    nome: data.nome,
    cpf: toNullable(data.cpf),
    email: toNullable(data.email),
    telefone: toNullable(data.telefone),
    tipo: data.tipo,
  };

  try {
    if (id) {
      await prisma.sindico.update({ where: { id }, data: payload });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "ATUALIZACAO",
        entidade: "Sindico",
        entidadeId: id,
        dadosDepois: payload,
      });
    } else {
      const criado = await prisma.sindico.create({ data: payload });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "CRIACAO",
        entidade: "Sindico",
        entidadeId: criado.id,
        dadosDepois: payload,
      });
    }
  } catch {
    return { success: false, error: "Não foi possível salvar. CPF já cadastrado?" };
  }

  revalidatePath("/dashboard/sindicos");
  revalidatePath("/dashboard/condominios");
  return { success: true };
}

// UX-1: mesma correção aplicada a Fornecedores — reversão de inativação
// pela interface, no mesmo padrão já usado para Usuários.
export async function alternarAtivoSindico(id: string, ativo: boolean) {
  const session = await requireRole("ADMIN");
  await prisma.sindico.update({ where: { id }, data: { ativo } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: ativo ? "ATUALIZACAO" : "EXCLUSAO",
    entidade: "Sindico",
    entidadeId: id,
    dadosDepois: { ativo },
  });
  revalidatePath("/dashboard/sindicos");
  revalidatePath("/dashboard/condominios");
}
