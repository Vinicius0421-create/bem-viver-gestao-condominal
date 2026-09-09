"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { MovimentoFundoReservaSchema } from "@/lib/validations/fundo-reserva";
import type { ActionState } from "@/app/actions/condominios";

function toNullable(v: string | undefined | null) {
  return v && v.length > 0 ? v : null;
}

export async function salvarMovimentoFundoReserva(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const id = formData.get("id")?.toString();
  const parsed = MovimentoFundoReservaSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  // saldoFinal nunca é aceito diretamente do formulário — é sempre
  // recalculado no servidor para impedir inconsistência entre o valor
  // exibido e a composição real (saldo anterior + aportes + rendimento -
  // resgates).
  const saldoFinal = data.saldoInicial + data.aportes + data.rendimento - data.resgates;

  const payload = {
    condominioId: data.condominioId,
    competenciaMes: data.competenciaMes,
    competenciaAno: data.competenciaAno,
    saldoInicial: data.saldoInicial,
    aportes: data.aportes,
    resgates: data.resgates,
    rendimento: data.rendimento,
    saldoFinal,
    observacoes: toNullable(data.observacoes),
  };

  try {
    if (id) {
      const antes = await prisma.movimentoFundoReserva.findUnique({ where: { id } });
      await prisma.movimentoFundoReserva.update({ where: { id }, data: payload });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "ATUALIZACAO",
        entidade: "MovimentoFundoReserva",
        entidadeId: id,
        dadosAntes: antes,
        dadosDepois: payload,
      });
    } else {
      const criado = await prisma.movimentoFundoReserva.create({
        data: { ...payload, criadoPorId: session.userId },
      });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "CRIACAO",
        entidade: "MovimentoFundoReserva",
        entidadeId: criado.id,
        dadosDepois: payload,
      });
    }
  } catch {
    return {
      success: false,
      error: "Já existe um movimento de fundo de reserva para este condomínio nesta competência.",
    };
  }

  revalidatePath("/dashboard/financeiro/fundo-reserva");
  revalidatePath("/dashboard/condominios");
  return { success: true };
}

export async function excluirMovimentoFundoReserva(id: string) {
  const session = await requireRole("GESTOR");

  // Sem soft-delete e sem estado de fluxo (diferente de PrestacaoContas,
  // que só permite excluir rascunhos) — o movimento de fundo de reserva é
  // um registro de apoio, não um demonstrativo publicado, então a exclusão
  // é sempre permitida a quem tem papel GESTOR ou superior.
  await prisma.movimentoFundoReserva.delete({ where: { id } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "EXCLUSAO",
    entidade: "MovimentoFundoReserva",
    entidadeId: id,
  });

  revalidatePath("/dashboard/financeiro/fundo-reserva");
  revalidatePath("/dashboard/condominios");
}
