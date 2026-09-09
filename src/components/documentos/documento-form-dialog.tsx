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

type Opcao = { id: string; nome: string };
type CategoriaOpcao = { id: string; nome: string; categoriaPaiId?: string | null };
type UnidadeOpcao = { id: string; condominioId: string; identificacao: string; bloco: string | null };

type DocumentoInicial = {
  id: string;
  condominioId: string | null;
  nome: string;
  descricao: string | null;
  categoriaId: string;
  dataValidade: Date | null;
  competenciaMes: number | null;
  competenciaAno: number | null;
  fornecedorId: string | null;
  unidadeId: string | null;
  tags: string[];
};

function paraInputDate(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function DocumentoFormDialog({
  condominios,
  categorias,
  fornecedores,
  unidades,
  condominioIdPadrao,
  documento,
}: {
  condominios: Opcao[];
  categorias: CategoriaOpcao[];
  fornecedores: Opcao[];
  unidades: UnidadeOpcao[];
  condominioIdPadrao?: string;
  documento?: DocumentoInicial;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(documento);
  const action = isEdit ? editarMetadadosDocumento : enviarDocumento;
  const { submit, pending, error } = useDialogAction(action, () => setOpen(false));
  const [condominioId, setCondominioId] = useState(
    documento?.condominioId ?? condominioIdPadrao ?? ""
  );
  // Unidade é escopada por condomínio no banco — mesmo padrão usado em
  // TituloFormDialog. Documento "geral" (sem condomínio) não tem unidades
  // para escolher.
  const unidadesDoCondominio = unidades.filter((u) => u.condominioId === condominioId);

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
              <Select name="condominioId" value={condominioId} onValueChange={setCondominioId} required>
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
              <Label htmlFor="categoriaId">Categoria *</Label>
              <Select name="categoriaId" defaultValue={documento?.categoriaId}>
                <SelectTrigger id="categoriaId">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.categoriaPaiId ? `— ${c.nome}` : c.nome}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="competenciaMes">Mês de competência</Label>
              <Select
                name="competenciaMes"
                defaultValue={documento?.competenciaMes ? String(documento.competenciaMes) : undefined}
              >
                <SelectTrigger id="competenciaMes">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {new Date(2000, m - 1, 1).toLocaleDateString("pt-BR", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="competenciaAno">Ano de competência</Label>
              <Input
                id="competenciaAno"
                name="competenciaAno"
                type="number"
                placeholder="Ex: 2026"
                defaultValue={documento?.competenciaAno ?? undefined}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Opcional — útil para localizar rapidamente boletos, notas fiscais e comprovantes de um
            mês/ano específico. Se preencher o mês, informe também o ano.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fornecedorId">Fornecedor</Label>
              <Select name="fornecedorId" defaultValue={documento?.fornecedorId ?? undefined}>
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
            <div className="space-y-1.5">
              <Label htmlFor="unidadeId">Unidade</Label>
              <Select
                name="unidadeId"
                defaultValue={documento?.unidadeId ?? undefined}
                disabled={!condominioId}
              >
                <SelectTrigger id="unidadeId">
                  <SelectValue
                    placeholder={condominioId ? "Nenhuma" : "Selecione o condomínio primeiro"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {unidadesDoCondominio.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.bloco ? `${u.bloco} — ${u.identificacao}` : u.identificacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (opcional)</Label>
            <Input
              id="tags"
              name="tags"
              placeholder="Ex: boleto, água, junho"
              defaultValue={documento?.tags?.join(", ") ?? ""}
            />
            <p className="text-xs text-muted-foreground">Separe múltiplas tags por vírgula.</p>
          </div>

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
