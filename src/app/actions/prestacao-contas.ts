"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import {
  GerarPrestacaoSchema,
  AtualizarPrestacaoSchema,
  ReabrirPrestacaoSchema,
} from "@/lib/validations/prestacao-contas";
import type { ActionState } from "@/app/actions/condominios";

// ----------------------------------------------------------------------------
// Núcleo de cálculo — reutilizado na geração inicial e na recalculagem.
// Mantido como função pura para garantir que a mesma regra de negócio seja
// aplicada em todos os pontos de entrada (nunca duplicar a lógica de soma).
// ----------------------------------------------------------------------------
async function calcularTotaisDoMes(condominioId: string, mes: number, ano: number) {
  const lancamentos = await prisma.lancamentoFinanceiro.findMany({
    where: { condominioId, competenciaMes: mes, competenciaAno: ano, excluidoEm: null },
    select: { id: true, tipo: true, valor: true },
  });

  const totalReceitas = lancamentos
    .filter((l) => l.tipo === "RECEITA")
    .reduce((acc, l) => acc + Number(l.valor), 0);
  const totalDespesas = lancamentos
    .filter((l) => l.tipo === "DESPESA")
    .reduce((acc, l) => acc + Number(l.valor), 0);

  return { lancamentos, totalReceitas, totalDespesas };
}

function mesAnterior(mes: number, ano: number) {
  return mes === 1 ? { mes: 12, ano: ano - 1 } : { mes: mes - 1, ano };
}

export async function gerarPrestacaoContas(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("OPERACIONAL");
  const parsed = GerarPrestacaoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { condominioId, competenciaMes, competenciaAno } = parsed.data;

  const existente = await prisma.prestacaoContas.findUnique({
    where: {
      condominioId_competenciaMes_competenciaAno: {
        condominioId,
        competenciaMes,
        competenciaAno,
      },
    },
  });
  if (existente) {
    return {
      success: false,
      error:
        "Já existe uma prestação de contas para esta competência. Abra o registro existente para editar.",
    };
  }

  const anterior = mesAnterior(competenciaMes, competenciaAno);
  const prestacaoAnterior = await prisma.prestacaoContas.findUnique({
    where: {
      condominioId_competenciaMes_competenciaAno: {
        condominioId,
        competenciaMes: anterior.mes,
        competenciaAno: anterior.ano,
      },
    },
    select: { saldoAtual: true },
  });
  const saldoAnterior = prestacaoAnterior ? Number(prestacaoAnterior.saldoAtual) : 0;

  const { lancamentos, totalReceitas, totalDespesas } = await calcularTotaisDoMes(
    condominioId,
    competenciaMes,
    competenciaAno
  );
  const saldoAtual = saldoAnterior + totalReceitas - totalDespesas;

  const criada = await prisma.prestacaoContas.create({
    data: {
      condominioId,
      competenciaMes,
      competenciaAno,
      saldoAnterior,
      totalReceitas,
      totalDespesas,
      saldoAtual,
      status: "RASCUNHO",
      itens: {
        create: lancamentos.map((l) => ({
          lancamentoId: l.id,
          valorConsiderado: l.valor,
        })),
      },
    },
  });

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "CRIACAO",
    entidade: "PrestacaoContas",
    entidadeId: criada.id,
    dadosDepois: { condominioId, competenciaMes, competenciaAno, saldoAnterior, saldoAtual },
  });

  revalidatePath("/dashboard/prestacao-de-contas");
  redirect(`/dashboard/prestacao-de-contas/${criada.id}`);
}

// Recalcula os itens (lançamentos) considerados na prestação, puxando
// qualquer lançamento novo/editado desde a geração inicial. Só permitido em
// RASCUNHO — depois de enviada para revisão, alterações passam pelo fluxo
// de "devolver para rascunho", garantindo rastreabilidade.
export async function recalcularPrestacaoContas(id: string) {
  const session = await requireRole("OPERACIONAL");

  const prestacao = await prisma.prestacaoContas.findUnique({ where: { id } });
  if (!prestacao) throw new Error("Prestação de contas não encontrada.");
  if (prestacao.status !== "RASCUNHO") {
    throw new Error("Só é possível recalcular prestações em rascunho.");
  }

  const { lancamentos, totalReceitas, totalDespesas } = await calcularTotaisDoMes(
    prestacao.condominioId,
    prestacao.competenciaMes,
    prestacao.competenciaAno
  );
  const saldoAtual = Number(prestacao.saldoAnterior) + totalReceitas - totalDespesas;

  await prisma.$transaction([
    prisma.prestacaoContasItem.deleteMany({ where: { prestacaoContasId: id } }),
    prisma.prestacaoContas.update({
      where: { id },
      data: {
        totalReceitas,
        totalDespesas,
        saldoAtual,
        itens: {
          create: lancamentos.map((l) => ({
            lancamentoId: l.id,
            valorConsiderado: l.valor,
          })),
        },
      },
    }),
  ]);

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "ATUALIZACAO",
    entidade: "PrestacaoContas",
    entidadeId: id,
    dadosDepois: { totalReceitas, totalDespesas, saldoAtual, recalculo: true },
  });

  revalidatePath(`/dashboard/prestacao-de-contas/${id}`);
}

export async function atualizarPrestacaoContas(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("OPERACIONAL");
  const prestacao = await prisma.prestacaoContas.findUnique({ where: { id } });
  if (!prestacao) return { success: false, error: "Prestação de contas não encontrada." };
  if (prestacao.status !== "RASCUNHO") {
    return { success: false, error: "Só é possível editar prestações em rascunho." };
  }

  const parsed = AtualizarPrestacaoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { saldoAnterior, observacoes } = parsed.data;
  const saldoAtual = saldoAnterior + Number(prestacao.totalReceitas) - Number(prestacao.totalDespesas);

  await prisma.prestacaoContas.update({
    where: { id },
    data: {
      saldoAnterior,
      saldoAtual,
      observacoes: observacoes && observacoes.length > 0 ? observacoes : null,
    },
  });

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "ATUALIZACAO",
    entidade: "PrestacaoContas",
    entidadeId: id,
    dadosDepois: { saldoAnterior, saldoAtual },
  });

  revalidatePath(`/dashboard/prestacao-de-contas/${id}`);
  return { success: true };
}

export async function enviarParaRevisao(id: string) {
  const session = await requireRole("OPERACIONAL");
  const prestacao = await prisma.prestacaoContas.findUnique({ where: { id } });
  if (!prestacao) throw new Error("Prestação de contas não encontrada.");
  if (prestacao.status !== "RASCUNHO") {
    throw new Error("Só é possível enviar para revisão a partir do rascunho.");
  }

  await prisma.prestacaoContas.update({ where: { id }, data: { status: "EM_REVISAO" } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "ATUALIZACAO",
    entidade: "PrestacaoContas",
    entidadeId: id,
    dadosDepois: { status: "EM_REVISAO" },
  });
  revalidatePath(`/dashboard/prestacao-de-contas/${id}`);
  revalidatePath("/dashboard/prestacao-de-contas");
}

export async function voltarParaRascunho(id: string) {
  const session = await requireRole("GESTOR");
  const prestacao = await prisma.prestacaoContas.findUnique({ where: { id } });
  if (!prestacao) throw new Error("Prestação de contas não encontrada.");
  if (prestacao.status !== "EM_REVISAO") {
    throw new Error("Só é possível devolver para rascunho a partir da revisão.");
  }

  await prisma.prestacaoContas.update({ where: { id }, data: { status: "RASCUNHO" } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "ATUALIZACAO",
    entidade: "PrestacaoContas",
    entidadeId: id,
    dadosDepois: { status: "RASCUNHO" },
  });
  revalidatePath(`/dashboard/prestacao-de-contas/${id}`);
  revalidatePath("/dashboard/prestacao-de-contas");
}

// Publicar é o ponto de não-retorno operacional: antes de travar o
// demonstrativo, recalcula os itens uma última vez para garantir que o
// documento publicado reflita o estado mais atual dos lançamentos.
export async function publicarPrestacaoContas(id: string) {
  const session = await requireRole("GESTOR");
  const prestacao = await prisma.prestacaoContas.findUnique({ where: { id } });
  if (!prestacao) throw new Error("Prestação de contas não encontrada.");
  if (prestacao.status !== "EM_REVISAO") {
    throw new Error("Só é possível publicar prestações que estejam em revisão.");
  }

  const { lancamentos, totalReceitas, totalDespesas } = await calcularTotaisDoMes(
    prestacao.condominioId,
    prestacao.competenciaMes,
    prestacao.competenciaAno
  );
  const saldoAtual = Number(prestacao.saldoAnterior) + totalReceitas - totalDespesas;

  await prisma.$transaction([
    prisma.prestacaoContasItem.deleteMany({ where: { prestacaoContasId: id } }),
    prisma.prestacaoContas.update({
      where: { id },
      data: {
        totalReceitas,
        totalDespesas,
        saldoAtual,
        status: "PUBLICADA",
        publicadoPorId: session.userId,
        publicadoEm: new Date(),
        itens: {
          create: lancamentos.map((l) => ({
            lancamentoId: l.id,
            valorConsiderado: l.valor,
          })),
        },
      },
    }),
  ]);

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "PUBLICACAO",
    entidade: "PrestacaoContas",
    entidadeId: id,
    dadosDepois: { status: "PUBLICADA", totalReceitas, totalDespesas, saldoAtual },
  });

  revalidatePath(`/dashboard/prestacao-de-contas/${id}`);
  revalidatePath("/dashboard/prestacao-de-contas");
  revalidatePath("/dashboard");
}

// Reabertura é uma exceção controlada — exige ADMIN e motivo obrigatório,
// ambos registrados em auditoria, para permitir corrigir um demonstrativo já
// publicado sem abrir mão de rastreabilidade (ex: erro identificado pelo
// síndico após o envio).
export async function reabrirPrestacaoContas(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  const prestacao = await prisma.prestacaoContas.findUnique({ where: { id } });
  if (!prestacao) return { success: false, error: "Prestação de contas não encontrada." };
  if (prestacao.status !== "PUBLICADA") {
    return { success: false, error: "Só é possível reabrir prestações publicadas." };
  }

  const parsed = ReabrirPrestacaoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Informe o motivo." };
  }

  const carimbo = `[Reaberta em ${new Date().toLocaleString("pt-BR")}] ${parsed.data.motivo}`;
  const observacoes = prestacao.observacoes ? `${prestacao.observacoes}\n\n${carimbo}` : carimbo;

  await prisma.prestacaoContas.update({
    where: { id },
    data: { status: "EM_REVISAO", observacoes },
  });

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "ATUALIZACAO",
    entidade: "PrestacaoContas",
    entidadeId: id,
    dadosAntes: { status: "PUBLICADA" },
    dadosDepois: { status: "EM_REVISAO", motivo: parsed.data.motivo },
  });

  revalidatePath(`/dashboard/prestacao-de-contas/${id}`);
  revalidatePath("/dashboard/prestacao-de-contas");
  return { success: true };
}

export async function excluirPrestacaoContas(id: string) {
  const session = await requireRole("GESTOR");
  const prestacao = await prisma.prestacaoContas.findUnique({ where: { id } });
  if (!prestacao) throw new Error("Prestação de contas não encontrada.");
  if (prestacao.status !== "RASCUNHO") {
    throw new Error(
      "Somente rascunhos podem ser excluídos. Prestações em revisão ou publicadas são protegidas contra exclusão."
    );
  }

  await prisma.prestacaoContas.delete({ where: { id } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "EXCLUSAO",
    entidade: "PrestacaoContas",
    entidadeId: id,
  });

  revalidatePath("/dashboard/prestacao-de-contas");
}
