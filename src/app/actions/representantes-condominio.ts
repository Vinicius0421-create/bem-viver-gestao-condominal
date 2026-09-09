"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { RepresentanteCondominioSchema } from "@/lib/validations/representante-condominio";
import type { ActionState } from "@/app/actions/condominios";

function toNullable(v: string | undefined | null) {
  return v && v.length > 0 ? v : null;
}

export async function salvarRepresentanteCondominio(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const id = formData.get("id")?.toString();

  const parsed = RepresentanteCondominioSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const payload = {
    condominioId: data.condominioId,
    papel: data.papel,
    nome: data.nome,
    cpf: toNullable(data.cpf),
    email: toNullable(data.email),
    telefone: toNullable(data.telefone),
    observacoes: toNullable(data.observacoes),
  };

  if (id) {
    await prisma.representanteCondominio.update({ where: { id }, data: payload });
  } else {
    await prisma.representanteCondominio.create({ data: payload });
  }
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: id ? "ATUALIZACAO" : "CRIACAO",
    entidade: "RepresentanteCondominio",
    entidadeId: id ?? data.condominioId,
    dadosDepois: payload,
  });

  revalidatePath(`/dashboard/condominios/${data.condominioId}`);
  return { success: true };
}

// Mesmo padrão de reversibilidade das demais entidades cadastrais (nunca
// excluir fisicamente): inativar grava `dataFim`, reativar limpa. Ao
// reabrir um mandato encerrado por engano, usar reativar; para uma nova
// gestão que reocupa o papel após um intervalo, cadastrar um novo
// registro em vez de reativar o antigo, preservando o histórico.
export async function alternarAtivoRepresentanteCondominio(
  id: string,
  ativo: boolean,
  condominioId: string
) {
  const session = await requireRole("ADMIN");
  const dataFim = ativo ? null : new Date();
  await prisma.representanteCondominio.update({ where: { id }, data: { ativo, dataFim } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: ativo ? "ATUALIZACAO" : "EXCLUSAO",
    entidade: "RepresentanteCondominio",
    entidadeId: id,
    dadosDepois: { ativo, dataFim },
  });
  revalidatePath(`/dashboard/condominios/${condominioId}`);
}
