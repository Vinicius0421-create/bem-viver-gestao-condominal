"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { TituloSchema } from "@/lib/validations/financeiro";
import type { ActionState } from "@/app/actions/condominios";

function toNullable(v: string | undefined | null) {
  return v && v.length > 0 ? v : null;
}

// Soma um mês a uma data, ajustando para o último dia do mês de destino
// quando o dia original não existir nele (ex: vencimento dia 31 de um mês
// com 30 dias, ou 29/fev em ano não bissexto vira 28/fev no ano seguinte).
function proximoMes(data: Date): Date {
  const dia = data.getDate();
  const primeiroDiaProximoMes = new Date(data.getFullYear(), data.getMonth() + 1, 1);
  const ultimoDiaProximoMes = new Date(
    primeiroDiaProximoMes.getFullYear(),
    primeiroDiaProximoMes.getMonth() + 1,
    0
  ).getDate();
  return new Date(
    primeiroDiaProximoMes.getFullYear(),
    primeiroDiaProximoMes.getMonth(),
    Math.min(dia, ultimoDiaProximoMes)
  );
}

export async function salvarTitulo(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("OPERACIONAL");
  const id = formData.get("id")?.toString();
  const parsed = TituloSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    recorrente: formData.get("recorrente") === "on",
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const payload = {
    condominioId: data.condominioId,
    tipo: data.tipo,
    descricao: data.descricao,
    categoriaId: toNullable(data.categoriaId),
    fornecedorId: toNullable(data.fornecedorId),
    unidadeId: toNullable(data.unidadeId),
    valor: data.valor,
    dataVencimento: new Date(data.dataVencimento),
    recorrente: data.recorrente,
    observacoes: toNullable(data.observacoes),
  };

  if (id) {
    await prisma.tituloFinanceiro.update({ where: { id }, data: payload });
    await registrarAuditoria({
      usuarioId: session.userId,
      acao: "ATUALIZACAO",
      entidade: "TituloFinanceiro",
      entidadeId: id,
      dadosDepois: payload,
    });
  } else {
    const criado = await prisma.tituloFinanceiro.create({ data: payload });
    await registrarAuditoria({
      usuarioId: session.userId,
      acao: "CRIACAO",
      entidade: "TituloFinanceiro",
      entidadeId: criado.id,
      dadosDepois: payload,
    });
  }

  revalidatePath("/dashboard/financeiro/titulos");
  return { success: true };
}

// Baixa de título: marca como pago/recebido e gera automaticamente o
// lançamento financeiro correspondente — elimina o retrabalho de lançar
// a mesma movimentação duas vezes (uma vez como previsão, outra como
// efetivada), como acontecia no controle manual.
export async function darBaixaTitulo(id: string) {
  const session = await requireRole("OPERACIONAL");

  const titulo = await prisma.tituloFinanceiro.findUnique({ where: { id } });
  if (!titulo) throw new Error("Título não encontrado.");
  if (titulo.status === "PAGO") throw new Error("Este título já está baixado.");

  const hoje = new Date();

  let categoriaId = titulo.categoriaId;
  if (!categoriaId) {
    const categoriaPadrao = await prisma.categoriaFinanceira.findFirst({
      where: { tipo: titulo.tipo === "PAGAR" ? "DESPESA" : "RECEITA", nome: "Outras Despesas" },
    });
    categoriaId =
      categoriaPadrao?.id ??
      (
        await prisma.categoriaFinanceira.findFirst({
          where: { tipo: titulo.tipo === "PAGAR" ? "DESPESA" : "RECEITA" },
        })
      )?.id ??
      null;
  }
  if (!categoriaId) throw new Error("Nenhuma categoria financeira disponível para gerar o lançamento.");

  const operacoes = [
    prisma.tituloFinanceiro.update({
      where: { id },
      data: { status: "PAGO", dataPagamento: hoje },
    }),
    prisma.lancamentoFinanceiro.create({
      data: {
        condominioId: titulo.condominioId,
        categoriaId,
        fornecedorId: titulo.fornecedorId,
        tipo: titulo.tipo === "PAGAR" ? "DESPESA" : "RECEITA",
        descricao: `[Baixa] ${titulo.descricao}`,
        valor: titulo.valor,
        competenciaMes: hoje.getMonth() + 1,
        competenciaAno: hoje.getFullYear(),
        dataMovimento: hoje,
        criadoPorId: session.userId,
      },
    }),
  ];

  // Título recorrente: ao dar baixa, já cria automaticamente o próximo
  // título (mesmo condomínio/categoria/fornecedor/valor, vencimento um mês
  // à frente, status pendente) — assim contas fixas mensais (ex: honorários,
  // seguro, internet) não precisam ser recadastradas todo mês, e o Fluxo de
  // Caixa passa a "enxergar" esse compromisso futuro na projeção de 30/60 dias
  // sem que ninguém precise lembrar de lançá-lo com antecedência.
  if (titulo.recorrente) {
    operacoes.push(
      prisma.tituloFinanceiro.create({
        data: {
          condominioId: titulo.condominioId,
          tipo: titulo.tipo,
          descricao: titulo.descricao,
          categoriaId: titulo.categoriaId,
          fornecedorId: titulo.fornecedorId,
          unidadeId: titulo.unidadeId,
          valor: titulo.valor,
          dataVencimento: proximoMes(titulo.dataVencimento),
          recorrente: true,
          observacoes: titulo.observacoes,
        },
      })
    );
  }

  await prisma.$transaction(operacoes);

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "ATUALIZACAO",
    entidade: "TituloFinanceiro",
    entidadeId: id,
    dadosDepois: { status: "PAGO" },
  });

  revalidatePath("/dashboard/financeiro/titulos");
  revalidatePath("/dashboard/financeiro/lancamentos");
  revalidatePath("/dashboard/financeiro/fluxo-de-caixa");
  revalidatePath("/dashboard");
}

export async function cancelarTitulo(id: string) {
  const session = await requireRole("GESTOR");
  await prisma.tituloFinanceiro.update({ where: { id }, data: { status: "CANCELADO" } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "ATUALIZACAO",
    entidade: "TituloFinanceiro",
    entidadeId: id,
    dadosDepois: { status: "CANCELADO" },
  });
  revalidatePath("/dashboard/financeiro/titulos");
}
