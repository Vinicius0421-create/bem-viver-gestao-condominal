"use client";

import { useActionState } from "react";
import Link from "next/link";
import { solicitarRecuperacaoSenha } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MailCheck } from "lucide-react";

export function EsqueciSenhaForm() {
  const [state, action, pending] = useActionState(solicitarRecuperacaoSenha, undefined);

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bv-gold-500/10">
          <MailCheck className="h-6 w-6 text-bv-gold-600" />
        </div>
        <p className="text-sm text-foreground">
          Se este e-mail estiver cadastrado no sistema, enviamos um link de
          recuperação. Verifique também a caixa de spam.
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-bv-gold-600 hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@bemviver.com"
          required
        />
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enviando..." : "Enviar link de recuperação"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-bv-gold-600 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
