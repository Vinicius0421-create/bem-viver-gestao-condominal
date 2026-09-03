"use client";

import { useActionState } from "react";
import Link from "next/link";
import { redefinirSenhaComToken } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

export function RedefinirSenhaForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(redefinirSenhaComToken, undefined);

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-6 w-6 text-success" />
        </div>
        <p className="text-sm text-foreground">Senha redefinida com sucesso.</p>
        <Link href="/login" className="inline-block text-sm font-medium text-bv-gold-600 hover:underline">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="senha">Nova senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
        <Input
          id="confirmarSenha"
          name="confirmarSenha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
