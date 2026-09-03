"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DetalhesLogDialog({
  dadosAntes,
  dadosDepois,
}: {
  dadosAntes: unknown;
  dadosDepois: unknown;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ver detalhes">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalhes do registro de auditoria</DialogTitle>
          <DialogDescription>
            Dados brutos capturados no momento da ação — úteis para investigar alterações.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {dadosAntes !== null && dadosAntes !== undefined && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Antes
              </p>
              <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(dadosAntes, null, 2)}
              </pre>
            </div>
          )}
          {dadosDepois !== null && dadosDepois !== undefined && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Depois
              </p>
              <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(dadosDepois, null, 2)}
              </pre>
            </div>
          )}
          {(dadosAntes === null || dadosAntes === undefined) &&
            (dadosDepois === null || dadosDepois === undefined) && (
              <p className="text-sm text-muted-foreground">
                Nenhum dado adicional registrado para esta ação.
              </p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
