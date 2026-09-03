import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { PapelUsuario } from "@/generated/prisma/enums";

// ----------------------------------------------------------------------------
// Sessão de autenticação — implementação própria (sem biblioteca de terceiros).
//
// Por quê: o projeto roda sobre Next.js 16, versão muito recente cujo modelo
// de rotas mudou (Proxy substituiu o antigo Middleware). Bibliotecas de auth
// de terceiros (ex: NextAuth/Auth.js) ainda não tinham suporte consolidado
// a essa mudança no momento da construção deste sistema. Para evitar
// depender de uma integração não testada com a versão mais nova do
// framework, a sessão foi implementada seguindo o padrão oficial
// documentado pelo próprio Next.js: JWT assinado (via `jose`, compatível
// com Edge Runtime) guardado em cookie httpOnly.
//
// Vantagem adicional: controle total sobre o formato da sessão, sem
// dependências externas de autenticação — superfície de ataque menor.
// ----------------------------------------------------------------------------

const COOKIE_NAME = "bv_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 horas de expediente

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET não configurado. Defina essa variável de ambiente antes de iniciar a aplicação."
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
};

export async function encryptSession(payload: SessionPayload, expiresAt: Date) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecretKey());
}

export async function decryptSession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  const token = await encryptSession(payload, expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return decryptSession(token);
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
