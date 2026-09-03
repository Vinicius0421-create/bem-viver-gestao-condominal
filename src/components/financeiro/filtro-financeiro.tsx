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

export function FiltroFinanceiro({
  condominios,
  valoresAtuais,
}: {
  condominios: Opcao[];
  valoresAtuais: { condominioId?: string; mes?: string; ano?: string };
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

  const anoAtual = new Date().getFullYear();
  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - i);

  const temFiltro = Boolean(valoresAtuais.condominioId || valoresAtuais.mes || valoresAtuais.ano);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={valoresAtuais.condominioId ?? "todos"}
        onValueChange={(v) => atualizar("condominioId", v === "todos" ? undefined : v)}
      >
        <SelectTrigger className="w-48">
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

      <Select
        value={valoresAtuais.mes ?? "todos"}
        onValueChange={(v) => atualizar("mes", v === "todos" ? undefined : v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os meses</SelectItem>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <SelectItem key={m} value={String(m)}>
              {new Date(2000, m - 1, 1).toLocaleDateString("pt-BR", { month: "long" })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={valoresAtuais.ano ?? "todos"}
        onValueChange={(v) => atualizar("ano", v === "todos" ? undefined : v)}
      >
        <SelectTrigger className="w-28">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {anos.map((a) => (
            <SelectItem key={a} value={String(a)}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {temFiltro && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
