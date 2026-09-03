"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, Send, Undo2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  recalcularPrestacaoContas,
  enviarParaRevisao,
  voltarParaRascunho,
  publicarPrestacaoContas,
} from "@/app/actions/prestacao-contas";

function useAcao(acao: () => Promise<void>) {
  const [isPending, startTransition] = useTransition();
  function executar() {
    startTransition(async () => {
      try {
        await acao();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
      }
    });
  }
  return { executar, isPending };
}

export function BotaoRecalcular({ id }: { id: string }) {
  const { executar, isPending } = useAcao(() => recalcularPrestacaoContas(id));
  return (
    <Button variant="outline" onClick={executar} disabled={isPending}>
      <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Recalculando..." : "Recalcular lançamentos"}
    </Button>
  );
}

export function BotaoEnviarRevisao({ id }: { id: string }) {
  const { executar, isPending } = useAcao(() => enviarParaRevisao(id));
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>
          <Send className="h-4 w-4" />
          Enviar para revisão
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar para revisão</AlertDialogTitle>
          <AlertDialogDescription>
            O rascunho será travado para edição de itens e ficará aguardando aprovação de um
            gestor ou administrador antes da publicação.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={executar}>
            {isPending ? "Enviando..." : "Enviar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function BotaoVoltarRascunho({ id }: { id: string }) {
  const { executar, isPending } = useAcao(() => voltarParaRascunho(id));
  return (
    <Button variant="outline" onClick={executar} disabled={isPending}>
      <Undo2 className="h-4 w-4" />
      {isPending ? "Processando..." : "Devolver para rascunho"}
    </Button>
  );
}

export function BotaoPublicar({ id }: { id: string }) {
  const { executar, isPending } = useAcao(() => publicarPrestacaoContas(id));
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="bg-success text-success-foreground hover:bg-success/90">
          <CheckCircle2 className="h-4 w-4" />
          Publicar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publicar prestação de contas</AlertDialogTitle>
          <AlertDialogDescription>
            Ao publicar, o demonstrativo é travado permanentemente (os valores e lançamentos
            considerados ficam congelados como registro oficial) e passa a ficar disponível para
            envio ao síndico. Esta ação fica registrada na auditoria.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={executar}>
            {isPending ? "Publicando..." : "Confirmar publicação"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
