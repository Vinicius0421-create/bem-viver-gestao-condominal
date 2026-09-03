"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarCategoria } from "@/app/actions/categorias";
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

type CategoriaInicial = {
  id: string;
  nome: string;
  tipo: string;
  natureza: string;
  cor: string | null;
};

export function CategoriaFormDialog({ categoria }: { categoria?: CategoriaInicial }) {
  const [open, setOpen] = useState(false);
  const { submit, pending, error } = useDialogAction(salvarCategoria, () => setOpen(false));

  const isEdit = Boolean(categoria);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar categoria">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Nova categoria
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar categoria" : "Nova categoria financeira"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {categoria && <input type="hidden" name="id" value={categoria.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={categoria?.nome} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select name="tipo" defaultValue={categoria?.tipo ?? "DESPESA"}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEITA">Receita</SelectItem>
                  <SelectItem value="DESPESA">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="natureza">Natureza *</Label>
              <Select name="natureza" defaultValue={categoria?.natureza ?? "FIXA"}>
                <SelectTrigger id="natureza">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXA">Fixa</SelectItem>
                  <SelectItem value="EXTRA">Extra</SelectItem>
                  <SelectItem value="BANCARIA">Bancária</SelectItem>
                  <SelectItem value="REPASSE">Repasse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cor">Cor (opcional)</Label>
            <Input id="cor" name="cor" type="color" defaultValue={categoria?.cor ?? "#C9A227"} className="h-9 w-16 p-1" />
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
