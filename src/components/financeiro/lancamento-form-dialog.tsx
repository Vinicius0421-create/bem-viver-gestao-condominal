"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarLancamento } from "@/app/actions/lancamentos";
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
type CategoriaOpcao = Opcao & { tipo: "RECEITA" | "DESPESA"; categoriaPaiId?: string | null };

type LancamentoInicial = {
  id: string;
  condominioId: string;
  categoriaId: string;
  fornecedorId: string | null;
  tipo: string;
  descricao: string;
  valor: string;
  competenciaMes: number;
  competenciaAno: number;
  dataMovimento: string;
  formaPagamento: string | null;
  observacoes: string | null;
};

const FORMAS_PAGAMENTO = [
  ["PIX", "Pix"],
  ["BOLETO", "Boleto"],
  ["TED", "TED"],
  ["DOC", "DOC"],
  ["DEBITO_AUTOMATICO", "Débito automático"],
  ["DINHEIRO", "Dinheiro"],
  ["CARTAO", "Cartão"],
  ["OUTRO", "Outro"],
];

export function LancamentoFormDialog({
  condominios,
  categorias,
  fornecedores,
  lancamento,
  condominioIdFixo,
}: {
  condominios: Opcao[];
  categorias: CategoriaOpcao[];
  fornecedores: Opcao[];
  lancamento?: LancamentoInicial;
  condominioIdFixo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<"RECEITA" | "DESPESA">(
    (lancamento?.tipo as "RECEITA" | "DESPESA") ?? "DESPESA"
  );
  const { submit, pending, error } = useDialogAction(salvarLancamento, () => setOpen(false));

  const isEdit = Boolean(lancamento);
  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);
  const hoje = new Date();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar lançamento">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Novo lançamento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {lancamento && <input type="hidden" name="id" value={lancamento.id} />}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="condominioId">Condomínio *</Label>
            <Select
              name="condominioId"
              defaultValue={lancamento?.condominioId ?? condominioIdFixo}
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
            <Label htmlFor="tipo">Tipo *</Label>
            <Select
              name="tipo"
              value={tipo}
              onValueChange={(v) => setTipo(v as "RECEITA" | "DESPESA")}
            >
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RECEITA">Receita</SelectItem>
                <SelectItem value="DESPESA">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="categoriaId">Categoria *</Label>
            <Select name="categoriaId" defaultValue={lancamento?.categoriaId} required>
              <SelectTrigger id="categoriaId">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categoriasDoTipo.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.categoriaPaiId ? `— ${c.nome}` : c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input id="descricao" name="descricao" defaultValue={lancamento?.descricao} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="valor">Valor (R$) *</Label>
            <Input
              id="valor"
              name="valor"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={lancamento?.valor}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dataMovimento">Data *</Label>
            <Input
              id="dataMovimento"
              name="dataMovimento"
              type="date"
              defaultValue={
                lancamento?.dataMovimento ?? hoje.toISOString().slice(0, 10)
              }
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="competenciaMes">Mês de competência *</Label>
            <Select
              name="competenciaMes"
              defaultValue={String(lancamento?.competenciaMes ?? hoje.getMonth() + 1)}
            >
              <SelectTrigger id="competenciaMes">
                <SelectValue />
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
            <Label htmlFor="competenciaAno">Ano de competência *</Label>
            <Input
              id="competenciaAno"
              name="competenciaAno"
              type="number"
              defaultValue={lancamento?.competenciaAno ?? hoje.getFullYear()}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fornecedorId">Fornecedor</Label>
            <Select name="fornecedorId" defaultValue={lancamento?.fornecedorId ?? undefined}>
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
            <Label htmlFor="formaPagamento">Forma de pagamento</Label>
            <Select name="formaPagamento" defaultValue={lancamento?.formaPagamento ?? undefined}>
              <SelectTrigger id="formaPagamento">
                <SelectValue placeholder="Não informado" />
              </SelectTrigger>
              <SelectContent>
                {FORMAS_PAGAMENTO.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" name="observacoes" defaultValue={lancamento?.observacoes ?? ""} />
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
