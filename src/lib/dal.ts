import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionFromCookies, type SessionPayload } from "@/lib/session";
import type { PapelUsuario } from "@/generated/prisma/enums";

// Data Access Layer — ponto único de verificação de sessão/autorização.
// Centralizar aqui evita que alguma rota, Server Action ou componente
// esqueça de checar autenticação (padrão recomendado pela documentação
// oficial do Next.js para App Router).
//
// `cache()` do React garante que, dentro do mesmo ciclo de renderização,
// múltiplas chamadas a `verifySession()` reaproveitam o mesmo resultado
// em vez de decodificar o JWT repetidas vezes.
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login");
  }
  return session;
});

// Versão que não redireciona — útil em layouts/componentes que precisam
// saber "há usuário logado?" sem forçar navegação (ex: mostrar/ocultar UI).
export const getOptionalSession = cache(async (): Promise<SessionPayload | null> => {
  return getSessionFromCookies();
});

const HIERARQUIA: Record<PapelUsuario, number> = {
  OPERACIONAL: 1,
  GESTOR: 2,
  ADMIN: 3,
};

export function papelAtendeMinimo(papel: PapelUsuario, minimo: PapelUsuario) {
  return HIERARQUIA[papel] >= HIERARQUIA[minimo];
}

// Para uso em Server Actions e Route Handlers que exigem um papel mínimo.
// Lança erro (não redireciona) — quem chama decide como tratar.
export async function requireRole(minimo: PapelUsuario) {
  const session = await verifySession();
  if (!papelAtendeMinimo(session.papel, minimo)) {
    throw new Error(
      `Ação não permitida para o seu perfil de acesso (requer nível ${minimo} ou superior).`
    );
  }
  return session;
}
