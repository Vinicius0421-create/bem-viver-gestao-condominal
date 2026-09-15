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

// CSP com nonce por requisição (HawkScan/StackHawk, achado Medium "CSP
// Header Not Set", corrigido em 15/09/2026). Um nonce por request é o único
// jeito de manter script-src restritivo (sem 'unsafe-inline') e ainda
// permitir o script de hidratação que o próprio Next.js injeta inline em
// toda página App Router (`self.__next_f.push(...)`, usado para transmitir
// o payload do RSC) — sem isso a aplicação inteira quebra (testado: sem
// nonce, a tela fica em branco com "Minified React error #412").
// style-src fica com 'unsafe-inline' em elem e attr — testado com nonce em
// style-src-elem (mesma técnica do script-src) e não funcionou de forma
// confiável: o Next.js/Turbopack injeta pelo menos 2 <style> inline fixos
// em toda página (fora do pipeline de auto-nonce documentado do Next) mais
// ao menos 1 variável por página (provavelmente CSS crítico), então não dá
// para fechar com nonce nem com hash fixo (o conteúdo varia por página) sem
// arriscar quebrar a aplicação a cada build. style-src-attr também precisa
// de 'unsafe-inline' porque os menus/dialogs do Radix (base do shadcn/ui)
// definem `style.transform`/`style.position` via JS a cada reposicionamento
// — CSP não aceita nonce para o atributo `style=""` alterado dinamicamente.
// Isso é um risco residual aceito (documentado no ROADMAP como achado
// Medium "CSP: style-src unsafe-inline" do HawkScan): a camada que
// realmente impede execução de XSS é script-src, que fica estrita (nonce +
// strict-dynamic, sem 'unsafe-inline'/'unsafe-eval' em produção) — CSS
// injetado sem um bug de XSS pré-existente tem uso ofensivo bem mais
// limitado do que JS injetado.
function buildCspHeader(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src-elem 'self' 'unsafe-inline';
    style-src-attr 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self' data:;
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

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

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = buildCspHeader(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
