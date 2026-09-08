"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarMorador } from "@/app/actions/moradores";
import { useDialogAction } from "@/hooks/use-dialog-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

type MoradorInicial = {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  tipoVinculo: string;
  principal: boolean;
  dataInicio: Date;
};

const TIPO_VINCULO_LABEL: Record<string, string> = {
  PROPRIETARIO: "Proprietário",
  INQUILINO: "Inquilino",
  DEPENDENTE: "Dependente",
};

function paraInputDate(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function MoradorFormDialog({
  condominioId,
  unidadeId,
  morador,
}: {
  condominioId: string;
  unidadeId: string;
  morador?: MoradorInicial;
}) {
  const [open, setOpen] = useState(false);
  const { submit, pending, error } = useDialogAction(salvarMorador, () => setOpen(false));

  const isEdit = Boolean(morador);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar morador">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Novo morador
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar morador" : "Novo morador"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          <input type="hidden" name="condominioId" value={condominioId} />
          <input type="hidden" name="unidadeId" value={unidadeId} />
          {morador && <input type="hidden" name="id" value={morador.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={morador?.nome} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" name="cpf" defaultValue={morador?.cpf ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipoVinculo">Vínculo *</Label>
              <Select name="tipoVinculo" defaultValue={morador?.tipoVinculo ?? "PROPRIETARIO"}>
                <SelectTrigger id="tipoVinculo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_VINCULO_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={morador?.email ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" defaultValue={morador?.telefone ?? ""} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dataInicio">Início do vínculo</Label>
            <Input
              id="dataInicio"
              name="dataInicio"
              type="date"
              defaultValue={morador?.dataInicio ? paraInputDate(morador.dataInicio) : ""}
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para hoje. Usado para responder quem morava em cada unidade em uma
              data específica.
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Checkbox id="principal" name="principal" defaultChecked={morador?.principal} />
              <Label htmlFor="principal" className="font-normal">
                Morador principal da unidade
              </Label>
            </div>
            <p className="pl-6 text-xs text-muted-foreground">
              Usado como contato prioritário para cobrança e comunicação. Marcar aqui desmarca
              automaticamente qualquer outro morador principal desta unidade.
            </p>
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
