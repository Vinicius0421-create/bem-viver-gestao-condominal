"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { enviarDocumento, editarMetadadosDocumento } from "@/app/actions/documentos";
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

export const CATEGORIA_LABEL: Record<string, string> = {
  CONTRATO: "Contrato",
  ATA: "Ata de assembleia",
  COMPROVANTE: "Documento financeiro (comprovante/nota fiscal)",
  CONVENCAO: "Convenção do condomínio",
  REGIMENTO_INTERNO: "Regimento interno",
  COMUNICADO: "Comunicado/circular",
  OUTRO: "Outro",
};

type Opcao = { id: string; nome: string };

type DocumentoInicial = {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  dataValidade: Date | null;
};

function paraInputDate(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function DocumentoFormDialog({
  condominios,
  condominioIdPadrao,
  documento,
}: {
  condominios: Opcao[];
  condominioIdPadrao?: string;
  documento?: DocumentoInicial;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(documento);
  const action = isEdit ? editarMetadadosDocumento : enviarDocumento;
  const { submit, pending, error } = useDialogAction(action, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar documento">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Novo documento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar documento" : "Enviar documento"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {documento && <input type="hidden" name="id" value={documento.id} />}

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="condominioId">Condomínio *</Label>
              <Select name="condominioId" defaultValue={condominioIdPadrao} required>
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
          )}

          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome do documento *</Label>
            <Input
              id="nome"
              name="nome"
              placeholder="Ex: Ata da assembleia geral ordinária"
              defaultValue={documento?.nome}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select name="categoria" defaultValue={documento?.categoria ?? "OUTRO"}>
                <SelectTrigger id="categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIA_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataValidade">Validade / vencimento</Label>
              <Input
                id="dataValidade"
                name="dataValidade"
                type="date"
                defaultValue={documento?.dataValidade ? paraInputDate(documento.dataValidade) : ""}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Preencha a validade apenas para documentos com prazo (contratos, seguros, certidões).
            Um alerta aparece no painel do condomínio a partir de 30 dias antes do vencimento.
          </p>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="arquivo">Arquivo *</Label>
              <Input
                id="arquivo"
                name="arquivo"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                required
              />
              <p className="text-xs text-muted-foreground">
                PDF, imagem (JPG/PNG/WEBP), Word ou Excel — até 10MB.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              name="descricao"
              placeholder="Observações opcionais sobre o documento"
              defaultValue={documento?.descricao ?? ""}
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
