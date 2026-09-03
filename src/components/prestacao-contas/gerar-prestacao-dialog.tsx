"use client";

import { useActionState, useState } from "react";
import { FilePlus2 } from "lucide-react";
import { gerarPrestacaoContas } from "@/app/actions/prestacao-contas";
import type { ActionState } from "@/app/actions/condominios";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { nomeMes } from "@/lib/utils";

type Opcao = { id: string; nome: string };

export function GerarPrestacaoDialog({ condominios }: { condominios: Opcao[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    gerarPrestacaoContas,
    undefined
  );

  // Sem efeito de fechamento aqui: em caso de sucesso, a própria Server
  // Action redireciona (`redirect()`) para a página do demonstrativo recém
  // criado — a navegação desmonta este diálogo naturalmente.

  const hoje = new Date();
  const anos = Array.from({ length: 4 }, (_, i) => hoje.getFullYear() - i);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FilePlus2 className="h-4 w-4" />
          Gerar prestação de contas
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar prestação de contas</DialogTitle>
          <DialogDescription>
            O sistema busca automaticamente todos os lançamentos financeiros do condomínio na
            competência selecionada e calcula o saldo com base na prestação do mês anterior.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="condominioId">Condomínio *</Label>
            <Select name="condominioId" required>
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
              <Label htmlFor="competenciaMes">Mês *</Label>
              <Select name="competenciaMes" defaultValue={String(hoje.getMonth() + 1)} required>
                <SelectTrigger id="competenciaMes">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {nomeMes(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="competenciaAno">Ano *</Label>
              <Select name="competenciaAno" defaultValue={String(hoje.getFullYear())} required>
                <SelectTrigger id="competenciaAno">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Gerando..." : "Gerar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
