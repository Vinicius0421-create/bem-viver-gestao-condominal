"use client";

import { useState } from "react";
import { HandCoins } from "lucide-react";
import { vincularGarantidora } from "@/app/actions/condominio-garantidoras";
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

type GarantidoraOpcao = {
  id: string;
  nome: string;
  taxaPadrao: string | null;
};

export function GarantidoraVinculoDialog({
  condominioId,
  garantidoras,
  temVinculoAtivo,
}: {
  condominioId: string;
  garantidoras: GarantidoraOpcao[];
  temVinculoAtivo: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { submit, pending, error } = useDialogAction(vincularGarantidora, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={garantidoras.length === 0}>
          <HandCoins className="h-4 w-4" />
          {temVinculoAtivo ? "Trocar garantidora" : "Vincular garantidora"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{temVinculoAtivo ? "Trocar garantidora" : "Vincular garantidora"}</DialogTitle>
          <DialogDescription>
            {temVinculoAtivo
              ? "O vínculo atual será encerrado automaticamente e este novo vínculo passará a ser o vigente."
              : "Vincula uma empresa de garantia/cobrança terceirizada a este condomínio."}
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          <input type="hidden" name="condominioId" value={condominioId} />
          <div className="space-y-1.5">
            <Label htmlFor="garantidoraId">Garantidora *</Label>
            <Select name="garantidoraId" required>
              <SelectTrigger id="garantidoraId">
                <SelectValue placeholder="Selecione a garantidora" />
              </SelectTrigger>
              <SelectContent>
                {garantidoras.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}
                    {g.taxaPadrao ? ` (padrão ${g.taxaPadrao}%)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taxaAplicada">Taxa aplicada (%)</Label>
            <Input
              id="taxaAplicada"
              name="taxaAplicada"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="Deixe em branco para usar a taxa padrão"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" name="observacoes" rows={2} />
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
