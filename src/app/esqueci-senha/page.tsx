import type { Metadata } from "next";
import { EsqueciSenhaForm } from "@/components/auth/esqueci-senha-form";
import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = {
  title: "Esqueci minha senha",
};

export default function EsqueciSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo variant="dark" className="justify-center" />
          <h2 className="mt-4 font-display text-2xl font-semibold text-foreground">
            Esqueci minha senha
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe seu e-mail de acesso e enviaremos um link para você criar uma nova senha.
          </p>
        </div>
        <EsqueciSenhaForm />
      </div>
    </div>
  );
}
