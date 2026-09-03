import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { verifySession, papelAtendeMinimo } from "@/lib/dal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GerarPrestacaoDialog } from "@/components/prestacao-contas/gerar-prestacao-dialog";
import { formatCurrencyBRL, competenciaLabel } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = { title: "Prestação de Contas" };

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted"> = {
  RASCUNHO: "muted",
  EM_REVISAO: "warning",
  PUBLICADA: "success",
};

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  EM_REVISAO: "Em revisão",
  PUBLICADA: "Publicada",
};

export default async function PrestacaoDeContasPage() {
  const session = await verifySession();
  const podeGerar = papelAtendeMinimo(session.papel, "OPERACIONAL");

  const [prestacoes, condominios] = await Promise.all([
    prisma.prestacaoContas.findMany({
      include: { condominio: true },
      orderBy: [{ competenciaAno: "desc" }, { competenciaMes: "desc" }, { condominio: { nome: "asc" } }],
      take: 100,
    }),
    prisma.condominio.findMany({
      where: { status: "ATIVO" },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const publicadas = prestacoes.filter((p) => p.status === "PUBLICADA").length;
  const emAndamento = prestacoes.length - publicadas;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Prestação de Contas
          </h1>
          <p className="text-sm text-muted-foreground">
            Demonstrativos financeiros mensais por condomínio — módulo principal da operação
          </p>
        </div>
        {podeGerar && <GerarPrestacaoDialog condominios={condominios} />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Total de demonstrativos</CardDescription>
            <CardTitle>{prestacoes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Publicadas</CardDescription>
            <CardTitle className="text-success">{publicadas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Em rascunho ou revisão</CardDescription>
            <CardTitle className={emAndamento > 0 ? "text-warning" : ""}>{emAndamento}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demonstrativos</CardTitle>
          <CardDescription>{prestacoes.length} registro(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead>Condomínio</TableHead>
                <TableHead className="text-right">Saldo anterior</TableHead>
                <TableHead className="text-right">Receitas</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Saldo atual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {prestacoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Nenhuma prestação de contas gerada ainda.
                  </TableCell>
                </TableRow>
              )}
              {prestacoes.map((p) => (
                <TableRow key={p.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/dashboard/prestacao-de-contas/${p.id}`}
                      className="block font-medium hover:text-bv-gold-600"
                    >
                      {competenciaLabel(p.competenciaMes, p.competenciaAno)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{p.condominio.nome}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrencyBRL(p.saldoAnterior.toString())}
                  </TableCell>
                  <TableCell className="text-right text-sm text-success">
                    {formatCurrencyBRL(p.totalReceitas.toString())}
                  </TableCell>
                  <TableCell className="text-right text-sm text-destructive">
                    {formatCurrencyBRL(p.totalDespesas.toString())}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrencyBRL(p.saldoAtual.toString())}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/prestacao-de-contas/${p.id}`}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
