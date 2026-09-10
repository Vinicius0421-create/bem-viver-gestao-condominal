"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarGarantidora } from "@/app/actions/garantidoras";
import { useDialogAction } from "@/hooks/use-dialog-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type GarantidoraInicial = {
  id: string;
  nome: string;
  cnpj: string | null;
  taxaPadrao: string | null;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
};

export function GarantidoraFormDialog({ garantidora }: { garantidora?: GarantidoraInicial }) {
  const [open, setOpen] = useState(false);
  const { submit, pending, error } = useDialogAction(salvarGarantidora, () => setOpen(false));
  const isEdit = Boolean(garantidora);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar garantidora">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Nova garantidora
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar garantidora" : "Nova garantidora"}</DialogTitle>
          <DialogDescription>
            Empresa terceirizada de garantia/cobrança (ex.: Confiança Condomínio Garantido).
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {garantidora && <input type="hidden" name="id" value={garantidora.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={garantidora?.nome} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" name="cnpj" defaultValue={garantidora?.cnpj ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxaPadrao">Taxa padrão (%)</Label>
              <Input
                id="taxaPadrao"
                name="taxaPadrao"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={garantidora?.taxaPadrao ?? ""}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" defaultValue={garantidora?.telefone ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={garantidora?.email ?? ""}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              defaultValue={garantidora?.observacoes ?? ""}
              rows={2}
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
