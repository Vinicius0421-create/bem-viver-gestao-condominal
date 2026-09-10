"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { GarantidoraSchema } from "@/lib/validations/cadastros";
import type { ActionState } from "@/app/actions/condominios";

function toNullable(v: string | undefined | null) {
  return v && v.length > 0 ? v : null;
}

export async function salvarGarantidora(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const id = formData.get("id")?.toString();
  const parsed = GarantidoraSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const payload = {
    nome: data.nome,
    cnpj: toNullable(data.cnpj),
    taxaPadrao: data.taxaPadrao ?? null,
    telefone: toNullable(data.telefone),
    email: toNullable(data.email),
    observacoes: toNullable(data.observacoes),
  };

  try {
    if (id) {
      await prisma.garantidora.update({ where: { id }, data: payload });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "ATUALIZACAO",
        entidade: "Garantidora",
        entidadeId: id,
        dadosDepois: payload,
      });
    } else {
      const criada = await prisma.garantidora.create({ data: payload });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "CRIACAO",
        entidade: "Garantidora",
        entidadeId: criada.id,
        dadosDepois: payload,
      });
    }
  } catch {
    return {
      success: false,
      error: "Não foi possível salvar. Nome ou CNPJ já cadastrado?",
    };
  }

  revalidatePath("/dashboard/garantidoras");
  revalidatePath("/dashboard/condominios");
  return { success: true };
}

// Mesmo padrão de reversibilidade (UX-1) já usado em Síndicos/Fornecedores:
// inativar não afeta vínculos já existentes, apenas some das opções para
// novos vínculos.
export async function alternarAtivoGarantidora(id: string, ativo: boolean) {
  const session = await requireRole("ADMIN");
  await prisma.garantidora.update({ where: { id }, data: { ativo } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: ativo ? "ATUALIZACAO" : "EXCLUSAO",
    entidade: "Garantidora",
    entidadeId: id,
    dadosDepois: { ativo },
  });
  revalidatePath("/dashboard/garantidoras");
  revalidatePath("/dashboard/condominios");
}
