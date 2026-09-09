"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarContatoCondominio } from "@/app/actions/contatos-condominio";
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

type ContatoInicial = {
  id: string;
  tipo: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
};

export function ContatoCondominioFormDialog({
  condominioId,
  contato,
}: {
  condominioId: string;
  contato?: ContatoInicial;
}) {
  const [open, setOpen] = useState(false);
  const { submit, pending, error } = useDialogAction(salvarContatoCondominio, () => setOpen(false));
  const isEdit = Boolean(contato);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar contato">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar contato" : "Novo contato"}</DialogTitle>
          <DialogDescription>
            Contatos operacionais do condomínio (portaria, zelador, financeiro, etc.).
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {contato && <input type="hidden" name="id" value={contato.id} />}
          <input type="hidden" name="condominioId" value={condominioId} />

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Input
              id="tipo"
              name="tipo"
              defaultValue={contato?.tipo}
              placeholder="Ex: Portaria, Zelador, Financeiro do condomínio"
              required
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" defaultValue={contato?.nome ?? ""} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" defaultValue={contato?.telefone ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={contato?.email ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              defaultValue={contato?.observacoes ?? ""}
              rows={2}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
              {error}
            </p>
          )}

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
