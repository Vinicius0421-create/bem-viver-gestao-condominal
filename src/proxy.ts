import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/session";

// Proxy (substitui o antigo "Middleware" a partir do Next.js 16) — faz apenas
// a checagem OTIMISTA de sessão (lê o cookie, sem consultar o banco) para
// redirecionar rapidamente usuários não autenticados. A checagem definitiva
// (papel/permissão por ação) acontece sempre no servidor, próxima aos dados,
// via `verifySession()`/`requireRole()` do Data Access Layer — este arquivo
// é só a primeira linha de defesa, não a única.
const PUBLIC_ROUTES = ["/login", "/esqueci-senha", "/redefinir-senha"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decryptSession(token);

  if (!isPublicRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(session ? "/dashboard" : "/login", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
