"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { LancamentoSchema } from "@/lib/validations/financeiro";
import type { ActionState } from "@/app/actions/condominios";

function toNullable(v: string | undefined | null) {
  return v && v.length > 0 ? v : null;
}

export async function salvarLancamento(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("OPERACIONAL");
  const id = formData.get("id")?.toString();
  const parsed = LancamentoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const payload = {
    condominioId: data.condominioId,
    categoriaId: data.categoriaId,
    fornecedorId: toNullable(data.fornecedorId),
    tipo: data.tipo,
    descricao: data.descricao,
    valor: data.valor,
    competenciaMes: data.competenciaMes,
    competenciaAno: data.competenciaAno,
    dataMovimento: new Date(data.dataMovimento),
    formaPagamento: data.formaPagamento || null,
    observacoes: toNullable(data.observacoes),
  };

  // Impede editar lançamentos já "congelados" numa prestação de contas
  // publicada — preserva a integridade do demonstrativo já entregue.
  if (id) {
    const jaPublicado = await prisma.prestacaoContasItem.findFirst({
      where: { lancamentoId: id, prestacaoContas: { status: "PUBLICADA" } },
    });
    if (jaPublicado) {
      return {
        success: false,
        error:
          "Este lançamento já faz parte de uma prestação de contas publicada e não pode mais ser editado.",
      };
    }
  }

  if (id) {
    const antes = await prisma.lancamentoFinanceiro.findUnique({ where: { id } });
    await prisma.lancamentoFinanceiro.update({ where: { id }, data: payload });
    await registrarAuditoria({
      usuarioId: session.userId,
      acao: "ATUALIZACAO",
      entidade: "LancamentoFinanceiro",
      entidadeId: id,
      dadosAntes: antes,
      dadosDepois: payload,
    });
  } else {
    const criado = await prisma.lancamentoFinanceiro.create({
      data: { ...payload, criadoPorId: session.userId },
    });
    await registrarAuditoria({
      usuarioId: session.userId,
      acao: "CRIACAO",
      entidade: "LancamentoFinanceiro",
      entidadeId: criado.id,
      dadosDepois: payload,
    });
  }

  revalidatePath("/dashboard/financeiro/lancamentos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function excluirLancamento(id: string) {
  const session = await requireRole("GESTOR");

  const jaPublicado = await prisma.prestacaoContasItem.findFirst({
    where: { lancamentoId: id, prestacaoContas: { status: "PUBLICADA" } },
  });
  if (jaPublicado) {
    throw new Error(
      "Este lançamento já faz parte de uma prestação de contas publicada e não pode ser excluído."
    );
  }

  // Soft delete — histórico financeiro nunca é apagado fisicamente.
  await prisma.lancamentoFinanceiro.update({
    where: { id },
    data: { excluidoEm: new Date() },
  });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "EXCLUSAO",
    entidade: "LancamentoFinanceiro",
    entidadeId: id,
  });
  revalidatePath("/dashboard/financeiro/lancamentos");
  revalidatePath("/dashboard");
}
