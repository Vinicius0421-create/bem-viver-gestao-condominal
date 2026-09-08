"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { MoradorSchema } from "@/lib/validations/cadastros";
import type { ActionState } from "@/app/actions/condominios";

function toNullable(v: string | undefined | null) {
  return v && v.length > 0 ? v : null;
}

function paraData(valor: string | undefined): Date | null {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

export async function salvarMorador(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const id = formData.get("id")?.toString();
  const unidadeId = formData.get("unidadeId")?.toString();
  const condominioId = formData.get("condominioId")?.toString();
  if (!unidadeId || !condominioId) {
    return { success: false, error: "Unidade não identificada." };
  }

  const parsed = MoradorSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    principal: formData.get("principal") === "on",
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  // dataInicio em branco: na criação, assume hoje; na edição, mantém a
  // data já registrada (busca o valor atual em vez de sobrescrever com
  // "agora", que apagaria o início real do vínculo).
  let dataInicio = paraData(data.dataInicio);
  if (!dataInicio) {
    if (id) {
      const atual = await prisma.morador.findUnique({ where: { id }, select: { dataInicio: true } });
      dataInicio = atual?.dataInicio ?? new Date();
    } else {
      dataInicio = new Date();
    }
  }

  const payload = {
    unidadeId,
    nome: data.nome,
    cpf: toNullable(data.cpf),
    email: toNullable(data.email),
    telefone: toNullable(data.telefone),
    tipoVinculo: data.tipoVinculo,
    principal: data.principal,
    dataInicio,
  };

  // Só pode haver um morador principal por unidade — ao marcar um novo
  // como principal, desmarca automaticamente qualquer outro da mesma
  // unidade (evita a tela ficar com dois "principal" simultâneos, o que
  // deixaria ambíguo para quem a prestação de contas/cobrança deve
  // endereçar prioritariamente).
  async function salvar() {
    if (id) {
      if (payload.principal) {
        await prisma.morador.updateMany({
          where: { unidadeId, id: { not: id }, principal: true },
          data: { principal: false },
        });
      }
      await prisma.morador.update({ where: { id }, data: payload });
      return id;
    }
    if (payload.principal) {
      await prisma.morador.updateMany({
        where: { unidadeId, principal: true },
        data: { principal: false },
      });
    }
    const criado = await prisma.morador.create({ data: payload });
    return criado.id;
  }

  const moradorId = await salvar();
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: id ? "ATUALIZACAO" : "CRIACAO",
    entidade: "Morador",
    entidadeId: moradorId,
    dadosDepois: payload,
  });

  revalidatePath(`/dashboard/condominios/${condominioId}/unidades/${unidadeId}`);
  return { success: true };
}

// Segue o mesmo padrão de reversibilidade adotado em UX-1 (Fornecedores,
// Síndicos): inativar/reativar em vez de excluir, com auditoria nos dois
// sentidos. Desde o Sprint 6, também mantém `dataFim` sincronizado com
// `ativo` — inativar grava a data de encerramento do vínculo (histórico
// de ocupação, seção 5.2 do plano de evolução); reativar limpa `dataFim`.
// Reativar deve ser usado só para desfazer um engano: para um morador que
// se mudou e depois voltou, o correto é manter este registro encerrado e
// cadastrar um novo (dataInicio novo), preservando o intervalo no
// histórico em vez de reescrevê-lo.
export async function alternarAtivoMorador(
  id: string,
  ativo: boolean,
  condominioId: string,
  unidadeId: string
) {
  const session = await requireRole("ADMIN");
  const dataFim = ativo ? null : new Date();
  await prisma.morador.update({ where: { id }, data: { ativo, dataFim } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: ativo ? "ATUALIZACAO" : "EXCLUSAO",
    entidade: "Morador",
    entidadeId: id,
    dadosDepois: { ativo, dataFim },
  });
  revalidatePath(`/dashboard/condominios/${condominioId}/unidades/${unidadeId}`);
}
