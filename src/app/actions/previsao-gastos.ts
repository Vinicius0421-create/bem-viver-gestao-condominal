"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import {
  PrevisaoGastosSchema,
  PrevisaoGastosItemSchema,
} from "@/lib/validations/previsao-gastos";
import type { ActionState } from "@/app/actions/condominios";

function toNullable(v: string | undefined | null) {
  return v && v.length > 0 ? v : null;
}

// Núcleo de cálculo — nunca aceito diretamente do formulário. Mesmo
// princípio já usado em MovimentoFundoReserva.saldoFinal: o valor exibido
// tem que ser sempre a soma real dos itens, nunca um número digitado à
// parte que possa divergir. valorPorUnidade só é calculado quando o
// condomínio tem qtdUnidades cadastrado — nas planilhas reais do Drive
// todo item tem essa coluna preenchida, mas o sistema não pode presumir
// isso para condomínios ainda sem esse dado.
function calcularValores(
  itens: { valorTotal: number }[],
  qtdUnidades: number | null
) {
  const valorTotalGeral = itens.reduce((acc, i) => acc + i.valorTotal, 0);
  const valorTotalPorUnidade = qtdUnidades && qtdUnidades > 0 ? valorTotalGeral / qtdUnidades : 0;
  const itensComRateio = itens.map((i) => ({
    ...i,
    valorPorUnidade: qtdUnidades && qtdUnidades > 0 ? i.valorTotal / qtdUnidades : null,
  }));
  return { valorTotalGeral, valorTotalPorUnidade, itensComRateio };
}

export async function salvarPrevisaoGastos(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("OPERACIONAL");
  const id = formData.get("id")?.toString();
  const parsed = PrevisaoGastosSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  let itensBrutos: unknown[];
  try {
    itensBrutos = JSON.parse(data.itensJson);
    if (!Array.isArray(itensBrutos) || itensBrutos.length === 0) {
      throw new Error("vazio");
    }
  } catch {
    return { success: false, error: "Adicione pelo menos um item de despesa." };
  }

  const itensParsed = [];
  for (const itemBruto of itensBrutos) {
    const itemResult = PrevisaoGastosItemSchema.safeParse(itemBruto);
    if (!itemResult.success) {
      return {
        success: false,
        error: `Item inválido: ${itemResult.error.issues[0]?.message ?? "dados incompletos"}.`,
      };
    }
    itensParsed.push(itemResult.data);
  }

  const condominio = await prisma.condominio.findUnique({
    where: { id: data.condominioId },
    select: { qtdUnidades: true },
  });
  if (!condominio) {
    return { success: false, error: "Condomínio não encontrado." };
  }

  const { valorTotalGeral, valorTotalPorUnidade, itensComRateio } = calcularValores(
    itensParsed.map((i) => ({ valorTotal: i.valorTotal })),
    condominio.qtdUnidades
  );

  const itensParaCriar = itensParsed.map((item, index) => ({
    categoriaId: item.categoriaId ?? null,
    tipo: item.tipo,
    descricao: item.descricao,
    valorTotal: item.valorTotal,
    valorPorUnidade: itensComRateio[index].valorPorUnidade,
    observacoes: toNullable(item.observacoes),
  }));

  const payloadBase = {
    condominioId: data.condominioId,
    competenciaMes: data.competenciaMes,
    competenciaAno: data.competenciaAno,
    diaLimitePagamento: data.diaLimitePagamento ?? null,
    observacoes: toNullable(data.observacoes),
    valorTotalGeral,
    valorTotalPorUnidade,
  };

  try {
    if (id) {
      const existente = await prisma.previsaoGastos.findUnique({ where: { id } });
      if (!existente) {
        return { success: false, error: "Previsão de gastos não encontrada." };
      }
      if (existente.status !== "RASCUNHO") {
        return {
          success: false,
          error: "Somente rascunhos podem ser editados. Esta previsão já foi publicada.",
        };
      }
      await prisma.$transaction([
        prisma.previsaoGastosItem.deleteMany({ where: { previsaoId: id } }),
        prisma.previsaoGastos.update({
          where: { id },
          data: { ...payloadBase, itens: { create: itensParaCriar } },
        }),
      ]);
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "ATUALIZACAO",
        entidade: "PrevisaoGastos",
        entidadeId: id,
        dadosDepois: payloadBase,
      });
      revalidatePath("/dashboard/previsao-gastos");
      revalidatePath(`/dashboard/previsao-gastos/${id}`);
      return { success: true };
    }

    const criada = await prisma.previsaoGastos.create({
      data: {
        ...payloadBase,
        criadoPorId: session.userId,
        itens: { create: itensParaCriar },
      },
    });
    await registrarAuditoria({
      usuarioId: session.userId,
      acao: "CRIACAO",
      entidade: "PrevisaoGastos",
      entidadeId: criada.id,
      dadosDepois: payloadBase,
    });
    revalidatePath("/dashboard/previsao-gastos");
    redirect(`/dashboard/previsao-gastos/${criada.id}`);
  } catch (e) {
    // redirect() lança internamente — deixa passar, não é um erro real.
    if (e && typeof e === "object" && "digest" in e) throw e;
    return {
      success: false,
      error: "Já existe uma previsão de gastos para este condomínio nesta competência.",
    };
  }
}

export async function publicarPrevisaoGastos(id: string) {
  const session = await requireRole("GESTOR");
  const previsao = await prisma.previsaoGastos.findUnique({ where: { id } });
  if (!previsao) throw new Error("Previsão de gastos não encontrada.");
  if (previsao.status !== "RASCUNHO") {
    throw new Error("Esta previsão já foi publicada.");
  }

  await prisma.previsaoGastos.update({
    where: { id },
    data: { status: "PUBLICADA", publicadoPorId: session.userId, publicadoEm: new Date() },
  });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "ATUALIZACAO",
    entidade: "PrevisaoGastos",
    entidadeId: id,
    dadosDepois: { status: "PUBLICADA" },
  });

  revalidatePath("/dashboard/previsao-gastos");
  revalidatePath(`/dashboard/previsao-gastos/${id}`);
}

export async function excluirPrevisaoGastos(id: string) {
  const session = await requireRole("GESTOR");
  const previsao = await prisma.previsaoGastos.findUnique({ where: { id } });
  if (!previsao) throw new Error("Previsão de gastos não encontrada.");
  if (previsao.status !== "RASCUNHO") {
    throw new Error(
      "Somente rascunhos podem ser excluídos. Previsões já publicadas são protegidas contra exclusão."
    );
  }

  await prisma.previsaoGastos.delete({ where: { id } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "EXCLUSAO",
    entidade: "PrevisaoGastos",
    entidadeId: id,
  });

  revalidatePath("/dashboard/previsao-gastos");
}
