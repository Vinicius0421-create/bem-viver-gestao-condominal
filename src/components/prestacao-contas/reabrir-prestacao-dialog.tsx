"use client";

import { useState } from "react";
import { LockOpen } from "lucide-react";
import { reabrirPrestacaoContas } from "@/app/actions/prestacao-contas";
import { useDialogAction } from "@/hooks/use-dialog-action";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ReabrirPrestacaoDialog({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const { submit, pending, error } = useDialogAction(
    reabrirPrestacaoContas.bind(null, id),
    () => setOpen(false)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
          <LockOpen className="h-4 w-4" />
          Reabrir para correção
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reabrir prestação publicada</DialogTitle>
          <DialogDescription>
            Esta é uma exceção controlada — a prestação volta para revisão e precisa ser publicada
            novamente. O motivo informado fica registrado permanentemente na auditoria e no próprio
            demonstrativo.
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="motivo">Motivo da reabertura *</Label>
            <Textarea
              id="motivo"
              name="motivo"
              required
              minLength={10}
              placeholder="Ex: síndico identificou lançamento duplicado em 05/07, necessário corrigir antes do reenvio."
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Reabrindo..." : "Confirmar reabertura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
