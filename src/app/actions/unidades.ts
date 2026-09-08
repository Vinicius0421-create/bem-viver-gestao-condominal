"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/audit";
import { UnidadeSchema } from "@/lib/validations/cadastros";
import type { ActionState } from "@/app/actions/condominios";

// Sprint 2 (Fase 2, item 1 do roadmap): cadastro de Unidades — o schema
// (`Unidade`) já existia no banco desde a Fase 1, mas nenhuma Server Action
// ou tela nunca foi implementada para ele. Sem isso, o sistema sabe quanto
// cada condomínio arrecadou no total, mas não consegue detalhar
// inadimplência por unidade.

export async function salvarUnidade(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole("GESTOR");
  const id = formData.get("id")?.toString();
  const condominioId = formData.get("condominioId")?.toString();
  if (!condominioId) {
    return { success: false, error: "Condomínio não identificado." };
  }

  const parsed = UnidadeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const payload = {
    condominioId,
    identificacao: data.identificacao,
    bloco: data.bloco && data.bloco.length > 0 ? data.bloco : null,
    fracaoIdeal: data.fracaoIdeal ?? null,
    valorTaxaBase: data.valorTaxaBase ?? null,
    status: data.status,
  };

  try {
    if (id) {
      await prisma.unidade.update({ where: { id }, data: payload });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "ATUALIZACAO",
        entidade: "Unidade",
        entidadeId: id,
        dadosDepois: payload,
      });
    } else {
      const criada = await prisma.unidade.create({ data: payload });
      await registrarAuditoria({
        usuarioId: session.userId,
        acao: "CRIACAO",
        entidade: "Unidade",
        entidadeId: criada.id,
        dadosDepois: payload,
      });
    }
  } catch {
    // Cobre principalmente a violação do @@unique([condominioId,
    // identificacao]) — identificação duplicada dentro do mesmo condomínio
    // (ex: dois cadastros de "Apto 101").
    return {
      success: false,
      error: `Não foi possível salvar. Verifique se já existe uma unidade com a identificação "${data.identificacao}" neste condomínio.`,
    };
  }

  revalidatePath(`/dashboard/condominios/${condominioId}/unidades`);
  revalidatePath(`/dashboard/condominios/${condominioId}`);
  return { success: true };
}
