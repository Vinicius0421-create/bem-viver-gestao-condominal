"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { CondominioSchema } from "@/lib/validations/condominio";

export type ActionState = { success: boolean; error?: string } | undefined;

function toNullable(value: string | undefined | null) {
  return value && value.length > 0 ? value : null;
}

// Ação única de "salvar" (cria se não houver `id` oculto no formulário,
// atualiza caso contrário) — simplifica o uso com `useActionState` no
// mesmo componente de formulário tanto para criação quanto edição.
export async function salvarCondominio(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");

  const id = formData.get("id")?.toString();
  const raw = Object.fromEntries(formData.entries());
  const parsed = CondominioSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const payload = {
    nome: data.nome,
    cnpj: toNullable(data.cnpj),
    endereco: toNullable(data.endereco),
    cidade: toNullable(data.cidade),
    estado: toNullable(data.estado)?.toUpperCase() ?? null,
    cep: toNullable(data.cep),
    banco: toNullable(data.banco),
    agencia: toNullable(data.agencia),
    conta: toNullable(data.conta),
    qtdUnidades: data.qtdUnidades ?? null,
    valorHonorarios: data.valorHonorarios ?? null,
    diaVencimentoTaxa: data.diaVencimentoTaxa ?? null,
    status: data.status,
    sindicoId: toNullable(data.sindicoId),
    observacoes: toNullable(data.observacoes),
  };

  try {
    if (id) {
      const antes = await prisma.condominio.findUnique({ where: { id } });
      if (!antes) return { success: false, error: "Condomínio não encontrado." };
      await prisma.condominio.update({ where: { id }, data: payload });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "ATUALIZACAO",
        entidade: "Condominio",
        entidadeId: id,
        dadosAntes: antes,
        dadosDepois: payload,
      });
      revalidatePath(`/dashboard/condominios/${id}`);
    } else {
      const criado = await prisma.condominio.create({ data: payload });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "CRIACAO",
        entidade: "Condominio",
        entidadeId: criado.id,
        dadosDepois: payload,
      });
    }
  } catch {
    return {
      success: false,
      error: "Não foi possível salvar. Verifique se o CNPJ informado já está em uso.",
    };
  }

  revalidatePath("/dashboard/condominios");
  return { success: true };
}

// Exclusão lógica — protege contra perda acidental de histórico financeiro
// vinculado ao condomínio (lançamentos, prestações de contas, etc.).
export async function arquivarCondominio(id: string) {
  const session = await requireRole("ADMIN");
  await prisma.condominio.update({
    where: { id },
    data: { status: "INATIVO", excluidoEm: new Date() },
  });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "EXCLUSAO",
    entidade: "Condominio",
    entidadeId: id,
  });
  revalidatePath("/dashboard/condominios");
}

export async function reativarCondominio(id: string) {
  const session = await requireRole("ADMIN");
  await prisma.condominio.update({
    where: { id },
    data: { status: "ATIVO", excluidoEm: null },
  });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "ATUALIZACAO",
    entidade: "Condominio",
    entidadeId: id,
    dadosDepois: { status: "ATIVO" },
  });
  revalidatePath("/dashboard/condominios");
}
