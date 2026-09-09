"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarRepresentanteCondominio } from "@/app/actions/representantes-condominio";
import { useDialogAction } from "@/hooks/use-dialog-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type RepresentanteInicial = {
  id: string;
  papel: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
};

export function RepresentanteFormDialog({
  condominioId,
  representante,
}: {
  condominioId: string;
  representante?: RepresentanteInicial;
}) {
  const [open, setOpen] = useState(false);
  const { submit, pending, error } = useDialogAction(salvarRepresentanteCondominio, () =>
    setOpen(false)
  );
  const isEdit = Boolean(representante);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar representante">
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
          <DialogTitle>{isEdit ? "Editar representante" : "Novo representante"}</DialogTitle>
          <DialogDescription>
            Subsíndico ou membro do conselho fiscal/consultivo do condomínio.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {representante && <input type="hidden" name="id" value={representante.id} />}
          <input type="hidden" name="condominioId" value={condominioId} />

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="papel">Papel *</Label>
            <Select name="papel" defaultValue={representante?.papel ?? "SUBSINDICO"}>
              <SelectTrigger id="papel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUBSINDICO">Subsíndico</SelectItem>
                <SelectItem value="CONSELHEIRO_PRESIDENTE">Presidente do conselho</SelectItem>
                <SelectItem value="CONSELHEIRO">Conselheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={representante?.nome} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" name="cpf" defaultValue={representante?.cpf ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" defaultValue={representante?.telefone ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={representante?.email ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              defaultValue={representante?.observacoes ?? ""}
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
