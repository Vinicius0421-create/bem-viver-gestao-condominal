"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { CondominioGarantidoraSchema } from "@/lib/validations/condominio-garantidora";
import type { ActionState } from "@/app/actions/condominios";

function toNullable(v: string | undefined | null) {
  return v && v.length > 0 ? v : null;
}

// Vincula uma garantidora ao condomínio. Se já houver um vínculo ativo,
// ele é encerrado (dataFim = agora) na mesma transação em que o novo é
// criado — nunca dois vínculos ativos ao mesmo tempo para o mesmo
// condomínio (mesmo racional de "encerra o anterior, cria o novo" já
// usado para troca de proprietário/inquilino em Morador). Serve tanto
// para o primeiro vínculo quanto para uma troca de prestador.
export async function vincularGarantidora(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const parsed = CondominioGarantidoraSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const payload = {
    condominioId: data.condominioId,
    garantidoraId: data.garantidoraId,
    taxaAplicada: data.taxaAplicada ?? null,
    observacoes: toNullable(data.observacoes),
  };

  const criado = await prisma.$transaction(async (tx) => {
    await tx.condominioGarantidora.updateMany({
      where: { condominioId: data.condominioId, ativo: true },
      data: { ativo: false, dataFim: new Date() },
    });
    return tx.condominioGarantidora.create({ data: payload });
  });

  await registrarAuditoria({
    usuarioId: session.userId,
    acao: "CRIACAO",
    entidade: "CondominioGarantidora",
    entidadeId: criado.id,
    dadosDepois: payload,
  });

  revalidatePath(`/dashboard/condominios/${data.condominioId}`);
  return { success: true };
}

// Encerra o vínculo vigente sem cadastrar um substituto (ex.: condomínio
// deixou de usar garantidora terceirizada). Mesmo padrão de reversibilidade
// (UX-1) das demais entidades: reativar limpa dataFim.
export async function alternarAtivoCondominioGarantidora(
  id: string,
  ativo: boolean,
  condominioId: string
) {
  const session = await requireRole("ADMIN");
  const dataFim = ativo ? null : new Date();
  await prisma.condominioGarantidora.update({ where: { id }, data: { ativo, dataFim } });
  await registrarAuditoria({
    usuarioId: session.userId,
    acao: ativo ? "ATUALIZACAO" : "EXCLUSAO",
    entidade: "CondominioGarantidora",
    entidadeId: id,
    dadosDepois: { ativo, dataFim },
  });
  revalidatePath(`/dashboard/condominios/${condominioId}`);
}
