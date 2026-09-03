"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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

// Botão de exclusão/ação destrutiva com confirmação — usado em toda a
// aplicação para evitar exclusões acidentais (proteção exigida pela
// missão do projeto).
//
// `icon` recebe um elemento JÁ RENDERIZADO (ex: `<Trash2 className="h-4 w-4" />`),
// não uma referência de componente. Isso é proposital: como este é um Client
// Component frequentemente instanciado a partir de Server Components (as
// páginas de listagem), passar a referência da função do ícone (ex:
// `icon={CheckCircle2}`) quebra em runtime — funções não são serializáveis
// através do limite servidor/cliente do React Server Components. Um
// elemento React já renderizado, por outro lado, é serializável.
export function ConfirmActionButton({
  action,
  titulo,
  descricao,
  labelBotao = "Excluir",
  icon = <Trash2 className="h-4 w-4" />,
}: {
  action: () => Promise<void>;
  titulo: string;
  descricao: string;
  labelBotao?: string;
  icon?: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={labelBotao}>
          {icon}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await action();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
                }
              });
            }}
          >
            {isPending ? "Processando..." : labelBotao}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
