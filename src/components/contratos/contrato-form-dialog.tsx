"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarContrato } from "@/app/actions/contratos";
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
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

type Opcao = { id: string; nome: string };

type ContratoInicial = {
  id: string;
  condominioId: string;
  fornecedorId: string | null;
  nome: string;
  tipo: string;
  dataInicio: Date;
  dataFim: Date | null;
  valor: string | null;
  periodicidade: string | null;
  observacoes: string | null;
};

function paraInputDate(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function ContratoFormDialog({
  condominios,
  fornecedores,
  condominioIdPadrao,
  contrato,
}: {
  condominios: Opcao[];
  fornecedores: Opcao[];
  condominioIdPadrao?: string;
  contrato?: ContratoInicial;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(contrato);
  const { submit, pending, error } = useDialogAction(salvarContrato, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar contrato">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Novo contrato
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar contrato" : "Novo contrato"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {contrato && <input type="hidden" name="id" value={contrato.id} />}

          <div className="space-y-1.5">
            <Label htmlFor="condominioId">Condomínio *</Label>
            <Select
              name="condominioId"
              defaultValue={contrato?.condominioId ?? condominioIdPadrao}
              required
            >
              <SelectTrigger id="condominioId">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {condominios.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome do contrato *</Label>
            <Input
              id="nome"
              name="nome"
              placeholder="Ex: Contrato de portaria 24h"
              defaultValue={contrato?.nome}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo de serviço *</Label>
              <Input
                id="tipo"
                name="tipo"
                placeholder="Ex: Portaria, Limpeza, Manutenção"
                defaultValue={contrato?.tipo}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fornecedorId">Fornecedor</Label>
              <Select name="fornecedorId" defaultValue={contrato?.fornecedorId ?? undefined}>
                <SelectTrigger id="fornecedorId">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dataInicio">Início *</Label>
              <Input
                id="dataInicio"
                name="dataInicio"
                type="date"
                defaultValue={contrato?.dataInicio ? paraInputDate(contrato.dataInicio) : ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataFim">Fim / vencimento</Label>
              <Input
                id="dataFim"
                name="dataFim"
                type="date"
                defaultValue={contrato?.dataFim ? paraInputDate(contrato.dataFim) : ""}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Deixe a data de fim em branco para contratos por prazo indeterminado. Um alerta
            aparece a partir de 60 dias antes do vencimento.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                name="valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                defaultValue={contrato?.valor ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periodicidade">Periodicidade</Label>
              <Input
                id="periodicidade"
                name="periodicidade"
                placeholder="Ex: Mensal, Anual"
                defaultValue={contrato?.periodicidade ?? ""}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="arquivo">
              {isEdit ? "Substituir arquivo (opcional)" : "Arquivo (opcional)"}
            </Label>
            <Input
              id="arquivo"
              name="arquivo"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            />
            <p className="text-xs text-muted-foreground">
              PDF, imagem (JPG/PNG/WEBP), Word ou Excel — até 10MB.
              {isEdit && " Enviar um novo arquivo substitui o anterior."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              placeholder="Observações opcionais sobre o contrato"
              defaultValue={contrato?.observacoes ?? ""}
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
