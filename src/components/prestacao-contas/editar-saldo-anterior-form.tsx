"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { atualizarPrestacaoContas } from "@/app/actions/prestacao-contas";
import type { ActionState } from "@/app/actions/condominios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EditarSaldoAnteriorForm({
  id,
  saldoAnterior,
  observacoes,
  semSaldoAnteriorEncontrado,
}: {
  id: string;
  saldoAnterior: string;
  observacoes: string | null;
  semSaldoAnteriorEncontrado: boolean;
}) {
  const atualizarComId = atualizarPrestacaoContas.bind(null, id);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    atualizarComId,
    undefined
  );
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    if (state?.success) toast.success("Prestação de contas atualizada.");
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      {semSaldoAnteriorEncontrado && (
        <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
          Não foi encontrada uma prestação de contas publicada para o mês anterior. O saldo
          anterior foi definido como R$ 0,00 — confirme o valor correto abaixo antes de enviar
          para revisão.
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="saldoAnterior">Saldo do mês anterior (R$)</Label>
        <Input
          id="saldoAnterior"
          name="saldoAnterior"
          type="number"
          step="0.01"
          defaultValue={saldoAnterior}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea id="observacoes" name="observacoes" defaultValue={observacoes ?? ""} />
      </div>
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="outline" disabled={pending} size="sm">
        {pending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
