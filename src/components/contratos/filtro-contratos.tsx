"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Opcao = { id: string; nome: string };

export function FiltroContratos({
  condominios,
  valoresAtuais,
}: {
  condominios: Opcao[];
  valoresAtuais: { condominioId?: string; inativos?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();

  function atualizar(chave: string, valor: string | undefined) {
    const params = new URLSearchParams(valoresAtuais as Record<string, string>);
    if (valor) {
      params.set(chave, valor);
    } else {
      params.delete(chave);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={valoresAtuais.condominioId ?? "todos"}
        onValueChange={(v) => atualizar("condominioId", v === "todos" ? undefined : v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Todos os condomínios" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os condomínios</SelectItem>
          {condominios.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {valoresAtuais.condominioId && (
        <Button variant="ghost" size="sm" onClick={() => atualizar("condominioId", undefined)}>
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
