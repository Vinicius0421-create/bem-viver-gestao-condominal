"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarCondominio } from "@/app/actions/condominios";
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

type Sindico = { id: string; nome: string };

type CondominioInicial = {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  qtdUnidades: number | null;
  valorHonorarios: string | null;
  diaVencimentoTaxa: number | null;
  status: string;
  sindicoId: string | null;
  observacoes: string | null;
};

export function CondominioFormDialog({
  sindicos,
  condominio,
}: {
  sindicos: Sindico[];
  condominio?: CondominioInicial;
}) {
  const [open, setOpen] = useState(false);
  const { submit, pending, error } = useDialogAction(salvarCondominio, () => setOpen(false));

  const isEdit = Boolean(condominio);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar condomínio">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Novo condomínio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar condomínio" : "Novo condomínio"}</DialogTitle>
          <DialogDescription>
            Dados cadastrais e bancários utilizados na prestação de contas.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {condominio && <input type="hidden" name="id" value={condominio.id} />}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="nome">Nome do condomínio *</Label>
            <Input id="nome" name="nome" defaultValue={condominio?.nome} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" name="cnpj" defaultValue={condominio?.cnpj ?? ""} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Status *</Label>
            <Select name="status" defaultValue={condominio?.status ?? "ATIVO"}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATIVO">Ativo</SelectItem>
                <SelectItem value="PROSPECT">Prospecção</SelectItem>
                <SelectItem value="INATIVO">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" name="endereco" defaultValue={condominio?.endereco ?? ""} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" name="cidade" defaultValue={condominio?.cidade ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="estado">UF</Label>
              <Input id="estado" name="estado" maxLength={2} defaultValue={condominio?.estado ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" name="cep" defaultValue={condominio?.cep ?? ""} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="banco">Banco</Label>
            <Input id="banco" name="banco" defaultValue={condominio?.banco ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="agencia">Agência</Label>
              <Input id="agencia" name="agencia" defaultValue={condominio?.agencia ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conta">Conta</Label>
              <Input id="conta" name="conta" defaultValue={condominio?.conta ?? ""} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qtdUnidades">Qtd. de unidades</Label>
            <Input
              id="qtdUnidades"
              name="qtdUnidades"
              type="number"
              min={0}
              defaultValue={condominio?.qtdUnidades ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="valorHonorarios">Honorários mensais (R$)</Label>
            <Input
              id="valorHonorarios"
              name="valorHonorarios"
              type="number"
              step="0.01"
              min={0}
              defaultValue={condominio?.valorHonorarios ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="diaVencimentoTaxa">Dia de vencimento da taxa</Label>
            <Input
              id="diaVencimentoTaxa"
              name="diaVencimentoTaxa"
              type="number"
              min={1}
              max={31}
              defaultValue={condominio?.diaVencimentoTaxa ?? ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sindicoId">Síndico responsável</Label>
            <Select name="sindicoId" defaultValue={condominio?.sindicoId ?? undefined}>
              <SelectTrigger id="sindicoId">
                <SelectValue placeholder="Nenhum selecionado" />
              </SelectTrigger>
              <SelectContent>
                {sindicos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              defaultValue={condominio?.observacoes ?? ""}
              rows={3}
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
