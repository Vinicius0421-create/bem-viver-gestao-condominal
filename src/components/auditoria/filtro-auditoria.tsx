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

const ACOES = [
  ["CRIACAO", "Criação"],
  ["ATUALIZACAO", "Atualização"],
  ["EXCLUSAO", "Exclusão"],
  ["PUBLICACAO", "Publicação"],
  ["LOGIN", "Login"],
  ["LOGIN_FALHOU", "Login falhou"],
];

const ENTIDADES = [
  ["Condominio", "Condomínio"],
  ["Sindico", "Síndico"],
  ["Fornecedor", "Fornecedor"],
  ["CategoriaFinanceira", "Categoria financeira"],
  ["LancamentoFinanceiro", "Lançamento financeiro"],
  ["TituloFinanceiro", "Título financeiro"],
  ["PrestacaoContas", "Prestação de contas"],
  ["Usuario", "Usuário"],
];

export function FiltroAuditoria({
  valoresAtuais,
}: {
  valoresAtuais: { acao?: string; entidade?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();

  function atualizar(chave: string, valor: string | undefined) {
    const params = new URLSearchParams(valoresAtuais as Record<string, string>);
    if (valor) params.set(chave, valor);
    else params.delete(chave);
    router.push(`${pathname}?${params.toString()}`);
  }

  const temFiltro = Boolean(valoresAtuais.acao || valoresAtuais.entidade);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={valoresAtuais.acao ?? "todas"}
        onValueChange={(v) => atualizar("acao", v === "todas" ? undefined : v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Todas as ações" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as ações</SelectItem>
          {ACOES.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={valoresAtuais.entidade ?? "todas"}
        onValueChange={(v) => atualizar("entidade", v === "todas" ? undefined : v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Todas as entidades" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as entidades</SelectItem>
          {ENTIDADES.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
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
