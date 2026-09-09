"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { ContatoCondominioSchema } from "@/lib/validations/contato-condominio";
import type { ActionState } from "@/app/actions/condominios";

function toNullable(v: string | undefined | null) {
  return v && v.length > 0 ? v : null;
}

export async function salvarContatoCondominio(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const id = formData.get("id")?.toString();

  const parsed = ContatoCondominioSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const payload = {
    condominioId: data.condominioId,
    tipo: data.tipo,
    nome: toNullable(data.nome),
    email: toNullable(data.email),
    telefone: toNullable(data.telefone),
    observacoes: toNullable(data.observacoes),
  };

  if (id) {
    await prisma.contatoCondominio.update({ where: { id }, data: payload });
  } else {
    await prisma.contatoCondominio.create({ data: payload });
  }
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: id ? "ATUALIZACAO" : "CRIACAO",
    entidade: "ContatoCondominio",
    entidadeId: id ?? data.condominioId,
    dadosDepois: payload,
  });

  revalidatePath(`/dashboard/condominios/${data.condominioId}`);
  return { success: true };
}

export async function alternarAtivoContatoCondominio(
  id: string,
  ativo: boolean,
  condominioId: string
) {
  const session = await requireRole("ADMIN");
  await prisma.contatoCondominio.update({ where: { id }, data: { ativo } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: ativo ? "ATUALIZACAO" : "EXCLUSAO",
    entidade: "ContatoCondominio",
    entidadeId: id,
    dadosDepois: { ativo },
  });
  revalidatePath(`/dashboard/condominios/${condominioId}`);
}
