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
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

type Opcao = { id: string; nome: string };
type CategoriaOpcao = { id: string; nome: string; categoriaPaiId?: string | null };

type ValoresFiltro = {
  condominioId?: string;
  categoriaId?: string;
  fornecedorId?: string;
  competenciaMes?: string;
  competenciaAno?: string;
};

export function FiltroDocumentos({
  condominios,
  categorias,
  fornecedores,
  valoresAtuais,
}: {
  condominios: Opcao[];
  categorias: CategoriaOpcao[];
  fornecedores: Opcao[];
  valoresAtuais: ValoresFiltro;
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

  const temFiltro = Boolean(
    valoresAtuais.condominioId ||
      valoresAtuais.categoriaId ||
      valoresAtuais.fornecedorId ||
      valoresAtuais.competenciaMes ||
      valoresAtuais.competenciaAno
  );

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

      <Select
        value={valoresAtuais.categoriaId ?? "todas"}
        onValueChange={(v) => atualizar("categoriaId", v === "todas" ? undefined : v)}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Todas as categorias" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as categorias</SelectItem>
          {categorias.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.categoriaPaiId ? `— ${c.nome}` : c.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={valoresAtuais.fornecedorId ?? "todos"}
        onValueChange={(v) => atualizar("fornecedorId", v === "todos" ? undefined : v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Todos os fornecedores" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os fornecedores</SelectItem>
          {fornecedores.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={valoresAtuais.competenciaMes ?? "todos"}
        onValueChange={(v) => atualizar("competenciaMes", v === "todos" ? undefined : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Mês de competência" />
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

      <Input
        type="number"
        placeholder="Ano"
        className="w-24"
        value={valoresAtuais.competenciaAno ?? ""}
        onChange={(e) => atualizar("competenciaAno", e.target.value || undefined)}
      />

      {temFiltro && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
