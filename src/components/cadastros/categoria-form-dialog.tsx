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
  ordem?: number;
  categoriaPaiId?: string | null;
};

// Só categorias principais (sem categoriaPaiId) entram aqui — hierarquia de
// 1 nível só, então uma subcategoria nunca aparece como opção de mãe.
type CategoriaPaiOpcao = { id: string; nome: string; tipo: string };

export function CategoriaFormDialog({
  categoria,
  categoriasPai = [],
}: {
  categoria?: CategoriaInicial;
  categoriasPai?: CategoriaPaiOpcao[];
}) {
  const [open, setOpen] = useState(false);
  const { submit, pending, error } = useDialogAction(salvarCategoria, () => setOpen(false));
  const [tipo, setTipo] = useState<"RECEITA" | "DESPESA">(
    (categoria?.tipo as "RECEITA" | "DESPESA") ?? "DESPESA"
  );

  const isEdit = Boolean(categoria);
  // Uma categoria não pode ser mãe de si mesma, e (ao editar) só faz
  // sentido oferecer categorias-mãe do mesmo tipo selecionado no formulário.
  const opcoesPai = categoriasPai.filter((c) => c.id !== categoria?.id && c.tipo === tipo);
  // Categorias que já têm subcategorias não podem virar subcategoria de
  // outra — a Server Action também valida isso, aqui é só uma pista visual.
  const jaESubcategoria = Boolean(categoria?.categoriaPaiId);

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
              <Select name="tipo" value={tipo} onValueChange={(v) => setTipo(v as "RECEITA" | "DESPESA")}>
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
            <Label htmlFor="categoriaPaiId">Subcategoria de (opcional)</Label>
            <Select
              name="categoriaPaiId"
              defaultValue={categoria?.categoriaPaiId ?? "nenhuma"}
              disabled={jaESubcategoria}
            >
              <SelectTrigger id="categoriaPaiId">
                <SelectValue placeholder="Categoria principal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Nenhuma — categoria principal</SelectItem>
                {opcoesPai.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {jaESubcategoria
                ? "Esta categoria já é uma subcategoria — só é permitido 1 nível de hierarquia."
                : "Deixe em branco para uma categoria principal. Só categorias do mesmo tipo (receita/despesa) aparecem aqui."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cor">Cor (opcional)</Label>
              <Input
                id="cor"
                name="cor"
                type="color"
                defaultValue={categoria?.cor ?? "#C9A227"}
                className="h-9 w-16 p-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ordem">Ordem</Label>
              <Input id="ordem" name="ordem" type="number" defaultValue={categoria?.ordem ?? 0} />
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
