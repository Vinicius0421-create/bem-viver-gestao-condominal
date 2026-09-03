"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarUsuario } from "@/app/actions/usuarios";
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
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

type UsuarioInicial = {
  id: string;
  nome: string;
  email: string;
  papel: string;
};

export function UsuarioFormDialog({ usuario }: { usuario?: UsuarioInicial }) {
  const [open, setOpen] = useState(false);
  const { submit, pending, error } = useDialogAction(salvarUsuario, () => setOpen(false));

  const isEdit = Boolean(usuario);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar usuário">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Novo usuário
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          <DialogDescription>
            Perfis de acesso definem o que cada colaborador pode ver e alterar.
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {usuario && <input type="hidden" name="id" value={usuario.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={usuario?.nome} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail *</Label>
            <Input id="email" name="email" type="email" defaultValue={usuario?.email} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="papel">Perfil de acesso *</Label>
            <Select name="papel" defaultValue={usuario?.papel ?? "OPERACIONAL"}>
              <SelectTrigger id="papel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERACIONAL">Operacional</SelectItem>
                <SelectItem value="GESTOR">Gestor</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha">
              {isEdit ? "Nova senha (deixe em branco para manter)" : "Senha provisória *"}
            </Label>
            <Input id="senha" name="senha" type="password" minLength={8} required={!isEdit} />
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
