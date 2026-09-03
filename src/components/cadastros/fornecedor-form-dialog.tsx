"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarFornecedor } from "@/app/actions/fornecedores";
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
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

type FornecedorInicial = {
  id: string;
  nome: string;
  cnpjCpf: string | null;
  categoria: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
};

export function FornecedorFormDialog({ fornecedor }: { fornecedor?: FornecedorInicial }) {
  const [open, setOpen] = useState(false);
  const { submit, pending, error } = useDialogAction(salvarFornecedor, () => setOpen(false));

  const isEdit = Boolean(fornecedor);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar fornecedor">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Novo fornecedor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {fornecedor && <input type="hidden" name="id" value={fornecedor.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome / Razão social *</Label>
            <Input id="nome" name="nome" defaultValue={fornecedor?.nome} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cnpjCpf">CNPJ/CPF</Label>
              <Input id="cnpjCpf" name="cnpjCpf" defaultValue={fornecedor?.cnpjCpf ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                name="categoria"
                placeholder="Ex: Limpeza, Manutenção"
                defaultValue={fornecedor?.categoria ?? ""}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" defaultValue={fornecedor?.telefone ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={fornecedor?.email ?? ""} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" name="endereco" defaultValue={fornecedor?.endereco ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" name="observacoes" defaultValue={fornecedor?.observacoes ?? ""} />
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
