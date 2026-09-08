"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarAssembleia } from "@/app/actions/assembleias";
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

type AssembleiaInicial = {
  id: string;
  condominioId: string;
  tipo: string;
  dataHora: Date;
  local: string | null;
  pauta: string;
  observacoes: string | null;
};

const TIPO_LABEL: Record<string, string> = {
  ORDINARIA: "Ordinária",
  EXTRAORDINARIA: "Extraordinária",
};

function paraInputDateTime(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  const hora = String(data.getHours()).padStart(2, "0");
  const minuto = String(data.getMinutes()).padStart(2, "0");
  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
}

export function AssembleiaFormDialog({
  condominios,
  condominioIdPadrao,
  assembleia,
}: {
  condominios: Opcao[];
  condominioIdPadrao?: string;
  assembleia?: AssembleiaInicial;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(assembleia);
  const { submit, pending, error } = useDialogAction(salvarAssembleia, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar assembleia">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Nova assembleia
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar assembleia" : "Nova assembleia"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {assembleia && <input type="hidden" name="id" value={assembleia.id} />}

          <div className="space-y-1.5">
            <Label htmlFor="condominioId">Condomínio *</Label>
            <Select
              name="condominioId"
              defaultValue={assembleia?.condominioId ?? condominioIdPadrao}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select name="tipo" defaultValue={assembleia?.tipo ?? "ORDINARIA"}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataHora">Data e horário *</Label>
              <Input
                id="dataHora"
                name="dataHora"
                type="datetime-local"
                defaultValue={assembleia?.dataHora ? paraInputDateTime(assembleia.dataHora) : ""}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="local">Local</Label>
            <Input
              id="local"
              name="local"
              placeholder="Ex: Salão de festas, ou link da videochamada"
              defaultValue={assembleia?.local ?? ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pauta">Pauta *</Label>
            <Textarea
              id="pauta"
              name="pauta"
              placeholder="Assuntos a serem tratados na assembleia"
              defaultValue={assembleia?.pauta}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="arquivo">{isEdit ? "Substituir ata (opcional)" : "Ata (opcional)"}</Label>
            <Input
              id="arquivo"
              name="arquivo"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            />
            <p className="text-xs text-muted-foreground">
              PDF, imagem (JPG/PNG/WEBP), Word ou Excel — até 10MB. Anexar a ata marca
              automaticamente a assembleia como &quot;Realizada&quot;.
              {isEdit && " Enviar um novo arquivo substitui o anterior."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              placeholder="Observações opcionais"
              defaultValue={assembleia?.observacoes ?? ""}
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
