import { redirect } from "next/navigation";

// A raiz do site é sempre resolvida pelo Proxy (src/proxy.ts), que redireciona
// para /dashboard (autenticado) ou /login (não autenticado). Este componente
// é apenas uma rede de segurança caso essa rota seja alcançada diretamente.
export default function Home() {
  redirect("/login");
}
