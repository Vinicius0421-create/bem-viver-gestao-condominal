import type { Metadata } from "next";
import Link from "next/link";
import { RedefinirSenhaForm } from "@/components/auth/redefinir-senha-form";
import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = {
  title: "Redefinir senha",
};

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo variant="dark" className="justify-center" />
          <h2 className="mt-4 font-display text-2xl font-semibold text-foreground">
            Redefinir senha
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha uma nova senha para acessar o sistema.
          </p>
        </div>

        {token ? (
          <RedefinirSenhaForm token={token} />
        ) : (
          <div className="space-y-4 text-center">
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Link inválido — falta o código de recuperação.
            </p>
            <Link
              href="/esqueci-senha"
              className="inline-block text-sm font-medium text-bv-gold-600 hover:underline"
            >
              Solicitar um novo link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
