import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { Logo, LogoMark } from "@/components/shared/logo";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Painel institucional — preto e dourado */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-bv-black p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(203,166,63,0.25), transparent 55%), radial-gradient(circle at 80% 80%, rgba(203,166,63,0.12), transparent 50%)",
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <LogoMark className="h-11 w-11 shrink-0 text-bv-gold-400" />
          <div>
            <span className="font-display text-2xl font-semibold tracking-wide text-bv-gold-300">
              Bem Viver
            </span>
            <p className="mt-0.5 text-sm text-white/60">
              Assessoria Condominial
            </p>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-3xl font-semibold leading-tight text-white">
            Gestão condominial com organização, transparência e confiança.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Sistema interno de administração financeira e prestação de
            contas dos condomínios geridos pela Bem Viver.
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} Bem Viver Assessoria Condominial.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <Logo variant="dark" className="justify-center lg:hidden lg:justify-start" />
            <h2 className="mt-4 font-display text-2xl font-semibold text-foreground">
              Acessar o sistema
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre com suas credenciais para continuar.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
