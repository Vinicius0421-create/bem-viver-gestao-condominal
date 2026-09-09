"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarMovimentoFundoReserva } from "@/app/actions/fundo-reserva";
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
import { nomeMes, formatCurrencyBRL } from "@/lib/utils";

type Opcao = { id: string; nome: string };

// Item mínimo do histórico já buscado pela página de listagem — reaproveitado
// aqui apenas para sugerir o saldo inicial, sem round-trip extra ao servidor.
export type HistoricoFundoReserva = {
  id: string;
  condominioId: string;
  competenciaMes: number;
  competenciaAno: number;
  saldoFinal: string;
};

export type MovimentoFundoReservaInicial = {
  id: string;
  condominioId: string;
  competenciaMes: number;
  competenciaAno: number;
  saldoInicial: string;
  aportes: string;
  resgates: string;
  rendimento: string;
  observacoes: string | null;
};

function competenciaOrdinal(mes: number, ano: number) {
  return ano * 12 + mes;
}

export function MovimentoFundoReservaFormDialog({
  condominios,
  historico,
  condominioIdPadrao,
  movimento,
}: {
  condominios: Opcao[];
  historico: HistoricoFundoReserva[];
  condominioIdPadrao?: string;
  movimento?: MovimentoFundoReservaInicial;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(movimento);
  const { submit, pending, error } = useDialogAction(
    salvarMovimentoFundoReserva,
    () => setOpen(false)
  );

  const hoje = new Date();
  const [condominioId, setCondominioId] = useState(
    movimento?.condominioId ?? condominioIdPadrao ?? ""
  );
  const [competenciaMes, setCompetenciaMes] = useState(
    String(movimento?.competenciaMes ?? hoje.getMonth() + 1)
  );
  const [competenciaAno, setCompetenciaAno] = useState(
    String(movimento?.competenciaAno ?? hoje.getFullYear())
  );

  // Sugestão de saldo inicial: última competência anterior à selecionada,
  // para o mesmo condomínio, cujo saldo final vira o ponto de partida
  // natural do mês seguinte. Apenas um hint informativo em modo de criação —
  // nunca sobrescreve um valor já digitado nem se aplica em edição.
  const sugestao = useMemo(() => {
    if (isEdit || !condominioId) return null;
    const mes = Number(competenciaMes);
    const ano = Number(competenciaAno);
    if (!mes || !ano) return null;
    const alvo = competenciaOrdinal(mes, ano);
    const candidatos = historico
      .filter((h) => h.condominioId === condominioId && competenciaOrdinal(h.competenciaMes, h.competenciaAno) < alvo)
      .sort(
        (a, b) =>
          competenciaOrdinal(b.competenciaMes, b.competenciaAno) -
          competenciaOrdinal(a.competenciaMes, a.competenciaAno)
      );
    return candidatos[0] ?? null;
  }, [isEdit, condominioId, competenciaMes, competenciaAno, historico]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar movimento">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Novo movimento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar movimento do fundo de reserva" : "Novo movimento do fundo de reserva"}
          </DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {movimento && <input type="hidden" name="id" value={movimento.id} />}

          <div className="space-y-1.5">
            <Label htmlFor="condominioId">Condomínio *</Label>
            <Select
              name="condominioId"
              value={condominioId}
              onValueChange={setCondominioId}
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
              <Label htmlFor="competenciaMes">Mês de competência *</Label>
              <Select
                name="competenciaMes"
                value={competenciaMes}
                onValueChange={setCompetenciaMes}
              >
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
              <Label htmlFor="competenciaAno">Ano de competência *</Label>
              <Input
                id="competenciaAno"
                name="competenciaAno"
                type="number"
                value={competenciaAno}
                onChange={(e) => setCompetenciaAno(e.target.value)}
                required
              />
            </div>
          </div>
          {isEdit && (
            <p className="-mt-2 text-xs text-muted-foreground">
              Alterar condomínio ou competência move este registro — evite mudá-los se já houver
              outro movimento vinculado a este mês.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="saldoInicial">Saldo inicial (R$) *</Label>
            <Input
              id="saldoInicial"
              name="saldoInicial"
              type="number"
              step="0.01"
              min="0"
              // key força remontar o campo (e reaplicar defaultValue) quando a
              // sugestão muda — Input não controlado não reagiria sozinho.
              key={movimento?.id ?? sugestao?.id ?? "novo"}
              defaultValue={movimento?.saldoInicial ?? sugestao?.saldoFinal}
              required
            />
            {!isEdit && sugestao && (
              <p className="text-xs text-muted-foreground">
                Sugerido a partir do saldo final de {nomeMes(sugestao.competenciaMes)}/
                {sugestao.competenciaAno}: {formatCurrencyBRL(sugestao.saldoFinal)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="aportes">Aportes (R$)</Label>
              <Input
                id="aportes"
                name="aportes"
                type="number"
                step="0.01"
                min="0"
                defaultValue={movimento?.aportes ?? "0"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resgates">Resgates (R$)</Label>
              <Input
                id="resgates"
                name="resgates"
                type="number"
                step="0.01"
                min="0"
                defaultValue={movimento?.resgates ?? "0"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rendimento">Rendimento (R$)</Label>
              <Input
                id="rendimento"
                name="rendimento"
                type="number"
                step="0.01"
                defaultValue={movimento?.rendimento ?? "0"}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Rendimento pode ser negativo em caso de perda na aplicação financeira. O saldo final é
            calculado automaticamente: saldo inicial + aportes + rendimento − resgates.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              placeholder="Ex: aplicação em CDB, resgate para obra emergencial..."
              defaultValue={movimento?.observacoes ?? ""}
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
