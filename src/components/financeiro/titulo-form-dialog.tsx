"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarTitulo } from "@/app/actions/titulos";
import { useDialogAction } from "@/hooks/use-dialog-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type Opcao = { id: string; nome: string };
type CategoriaOpcao = Opcao & { tipo: "RECEITA" | "DESPESA" };

// Formato aceito pelo <input type="date">, e é o mesmo formato que
// `TituloSchema.dataVencimento` espera receber de volta no submit.
function paraInputDate(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export type TituloInicial = {
  id: string;
  tipo: "PAGAR" | "RECEBER";
  condominioId: string;
  descricao: string;
  valor: string;
  dataVencimento: Date;
  categoriaId: string | null;
  fornecedorId: string | null;
  recorrente: boolean;
  observacoes: string | null;
};

export function TituloFormDialog({
  tipoInicial,
  condominios,
  categorias,
  fornecedores,
  titulo,
}: {
  tipoInicial: "PAGAR" | "RECEBER";
  condominios: Opcao[];
  categorias: CategoriaOpcao[];
  fornecedores: Opcao[];
  titulo?: TituloInicial;
}) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<"PAGAR" | "RECEBER">(titulo?.tipo ?? tipoInicial);
  const { submit, pending, error } = useDialogAction(salvarTitulo, () => setOpen(false));

  const isEdit = Boolean(titulo);
  const categoriasDoTipo = categorias.filter(
    (c) => c.tipo === (tipo === "PAGAR" ? "DESPESA" : "RECEITA")
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar título">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Novo título
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar título financeiro" : "Novo título financeiro"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {titulo && <input type="hidden" name="id" value={titulo.id} />}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select name="tipo" value={tipo} onValueChange={(v) => setTipo(v as "PAGAR" | "RECEBER")}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAGAR">A pagar</SelectItem>
                  <SelectItem value="RECEBER">A receber</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="condominioId">Condomínio *</Label>
              <Select name="condominioId" defaultValue={titulo?.condominioId} required>
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input id="descricao" name="descricao" defaultValue={titulo?.descricao} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                name="valor"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={titulo?.valor}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataVencimento">Vencimento *</Label>
              <Input
                id="dataVencimento"
                name="dataVencimento"
                type="date"
                defaultValue={titulo ? paraInputDate(titulo.dataVencimento) : undefined}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="categoriaId">Categoria</Label>
              <Select name="categoriaId" defaultValue={titulo?.categoriaId ?? undefined}>
                <SelectTrigger id="categoriaId">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasDoTipo.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fornecedorId">Fornecedor</Label>
              <Select name="fornecedorId" defaultValue={titulo?.fornecedorId ?? undefined}>
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

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Checkbox id="recorrente" name="recorrente" defaultChecked={titulo?.recorrente} />
              <Label htmlFor="recorrente" className="font-normal">
                Título recorrente (repete mensalmente)
              </Label>
            </div>
            <p className="pl-6 text-xs text-muted-foreground">
              Ao dar baixa neste título, o próximo mês já é criado automaticamente
              (mesmo valor e vencimento um mês à frente). Ideal para contas fixas,
              como honorários e assinaturas.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" name="observacoes" defaultValue={titulo?.observacoes ?? ""} />
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
