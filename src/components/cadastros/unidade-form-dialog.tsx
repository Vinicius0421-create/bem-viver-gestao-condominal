"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarUnidade } from "@/app/actions/unidades";
import { useDialogAction } from "@/hooks/use-dialog-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

type UnidadeInicial = {
  id: string;
  identificacao: string;
  bloco: string | null;
  fracaoIdeal: string | null;
  valorTaxaBase: string | null;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  OCUPADA: "Ocupada",
  VAGA: "Vaga",
  EM_OBRAS: "Em obras",
};

export function UnidadeFormDialog({
  condominioId,
  unidade,
}: {
  condominioId: string;
  unidade?: UnidadeInicial;
}) {
  const [open, setOpen] = useState(false);
  const { submit, pending, error } = useDialogAction(salvarUnidade, () => setOpen(false));

  const isEdit = Boolean(unidade);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar unidade">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Nova unidade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar unidade" : "Nova unidade"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          <input type="hidden" name="condominioId" value={condominioId} />
          {unidade && <input type="hidden" name="id" value={unidade.id} />}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="identificacao">Identificação *</Label>
              <Input
                id="identificacao"
                name="identificacao"
                placeholder="Ex: Apto 101"
                defaultValue={unidade?.identificacao}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bloco">Bloco</Label>
              <Input id="bloco" name="bloco" placeholder="Ex: A" defaultValue={unidade?.bloco ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fracaoIdeal">Fração ideal (%)</Label>
              <Input
                id="fracaoIdeal"
                name="fracaoIdeal"
                type="number"
                step="0.00001"
                min="0"
                defaultValue={unidade?.fracaoIdeal ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valorTaxaBase">Taxa condominial base (R$)</Label>
              <Input
                id="valorTaxaBase"
                name="valorTaxaBase"
                type="number"
                step="0.01"
                min="0"
                defaultValue={unidade?.valorTaxaBase ?? ""}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status *</Label>
            <Select name="status" defaultValue={unidade?.status ?? "OCUPADA"}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
