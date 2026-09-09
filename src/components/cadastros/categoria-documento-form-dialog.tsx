"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarCategoriaDocumento } from "@/app/actions/categorias-documento";
import { useDialogAction } from "@/hooks/use-dialog-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

type CategoriaDocumentoInicial = {
  id: string;
  nome: string;
  cor: string | null;
  ordem: number;
};

export function CategoriaDocumentoFormDialog({
  categoria,
}: {
  categoria?: CategoriaDocumentoInicial;
}) {
  const [open, setOpen] = useState(false);
  const { submit, pending, error } = useDialogAction(salvarCategoriaDocumento, () =>
    setOpen(false)
  );
  const isEdit = Boolean(categoria);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar categoria de documento">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4" />
            Nova categoria
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar categoria" : "Nova categoria de documento"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {categoria && <input type="hidden" name="id" value={categoria.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={categoria?.nome} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cor">Cor (opcional)</Label>
              <Input
                id="cor"
                name="cor"
                type="color"
                defaultValue={categoria?.cor ?? "#b3892f"}
                className="h-9 w-16 p-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ordem">Ordem</Label>
              <Input
                id="ordem"
                name="ordem"
                type="number"
                defaultValue={categoria?.ordem ?? 0}
              />
            </div>
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
