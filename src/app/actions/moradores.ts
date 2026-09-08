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
  const payload = {
    unidadeId,
    nome: data.nome,
    cpf: toNullable(data.cpf),
    email: toNullable(data.email),
    telefone: toNullable(data.telefone),
    tipoVinculo: data.tipoVinculo,
    principal: data.principal,
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
// sentidos.
export async function alternarAtivoMorador(
  id: string,
  ativo: boolean,
  condominioId: string,
  unidadeId: string
) {
  const session = await requireRole("ADMIN");
  await prisma.morador.update({ where: { id }, data: { ativo } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: ativo ? "ATUALIZACAO" : "EXCLUSAO",
    entidade: "Morador",
    entidadeId: id,
    dadosDepois: { ativo },
  });
  revalidatePath(`/dashboard/condominios/${condominioId}/unidades/${unidadeId}`);
}
