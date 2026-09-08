import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
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
import { formatCurrencyBRL } from "@/lib/utils";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const condominio = await prisma.condominio.findUnique({ where: { id } });
  return { title: condominio ? `Inadimplência — ${condominio.nome}` : "Inadimplência" };
}

type ResumoUnidade = {
  valorTotal: number;
  qtdTitulos: number;
  vencimentoMaisAntigo: Date;
};

function diasEmAtraso(dataVencimento: Date): number {
  const hoje = new Date();
  const diffMs = hoje.setHours(0, 0, 0, 0) - new Date(dataVencimento).setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export default async function InadimplenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await verifySession();

  const condominio = await prisma.condominio.findUnique({ where: { id } });
  if (!condominio) notFound();

  const [unidades, titulosEmAberto, titulosSemUnidade] = await Promise.all([
    prisma.unidade.findMany({
      where: { condominioId: id },
      orderBy: [{ bloco: "asc" }, { identificacao: "asc" }],
      include: {
        moradores: {
          where: { ativo: true, principal: true },
          take: 1,
          select: { nome: true },
        },
      },
    }),
    prisma.tituloFinanceiro.findMany({
      where: {
        condominioId: id,
        tipo: "RECEBER",
        unidadeId: { not: null },
        status: { in: ["PENDENTE", "ATRASADO"] },
        excluidoEm: null,
      },
      orderBy: { dataVencimento: "asc" },
    }),
    prisma.tituloFinanceiro.count({
      where: {
        condominioId: id,
        tipo: "RECEBER",
        unidadeId: null,
        status: { in: ["PENDENTE", "ATRASADO"] },
        excluidoEm: null,
      },
    }),
  ]);

  const resumoPorUnidade = new Map<string, ResumoUnidade>();
  for (const t of titulosEmAberto) {
    if (!t.unidadeId) continue;
    const atual = resumoPorUnidade.get(t.unidadeId);
    const valor = Number(t.valor);
    if (!atual) {
      resumoPorUnidade.set(t.unidadeId, {
        valorTotal: valor,
        qtdTitulos: 1,
        vencimentoMaisAntigo: t.dataVencimento,
      });
    } else {
      atual.valorTotal += valor;
      atual.qtdTitulos += 1;
      if (t.dataVencimento < atual.vencimentoMaisAntigo) {
        atual.vencimentoMaisAntigo = t.dataVencimento;
      }
    }
  }

  const unidadesInadimplentes = unidades.filter((u) => {
    const r = resumoPorUnidade.get(u.id);
    return r && diasEmAtraso(r.vencimentoMaisAntigo) > 0;
  });
  const valorTotalInadimplente = unidadesInadimplentes.reduce(
    (acc, u) => acc + (resumoPorUnidade.get(u.id)?.valorTotal ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/condominios/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {condominio.nome}
        </Link>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Inadimplência por unidade
        </h1>
        <p className="text-sm text-muted-foreground">
          Baseado em títulos financeiros do tipo &quot;a receber&quot; vinculados a uma unidade
        </p>
      </div>

      {titulosSemUnidade > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>
            Existem {titulosSemUnidade} título(s) a receber pendente(s) neste condomínio sem
            unidade vinculada — eles não aparecem neste detalhamento. Vincule a unidade ao
            cadastrar ou editar o título em{" "}
            <Link href="/dashboard/financeiro/titulos" className="underline underline-offset-2">
              Contas a Pagar/Receber
            </Link>{" "}
            para que passem a ser contabilizados aqui.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Unidades inadimplentes</CardDescription>
            <CardTitle className={unidadesInadimplentes.length > 0 ? "text-destructive" : ""}>
              {unidadesInadimplentes.length} de {unidades.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Valor total em atraso</CardDescription>
            <CardTitle className="text-destructive">
              {formatCurrencyBRL(valorTotalInadimplente)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Unidades em dia</CardDescription>
            <CardTitle className="text-success">
              {unidades.length - unidadesInadimplentes.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por unidade</CardTitle>
          <CardDescription>Ordenado por bloco/identificação</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead>Morador principal</TableHead>
                <TableHead>Títulos em aberto</TableHead>
                <TableHead className="text-right">Valor em aberto</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhuma unidade cadastrada.{" "}
                    <Link
                      href={`/dashboard/condominios/${id}/unidades`}
                      className="underline underline-offset-2"
                    >
                      Cadastrar unidades
                    </Link>
                    .
                  </TableCell>
                </TableRow>
              )}
              {unidades.map((u) => {
                const resumo = resumoPorUnidade.get(u.id);
                const atraso = resumo ? diasEmAtraso(resumo.vencimentoMaisAntigo) : 0;
                const situacao = !resumo
                  ? { label: "Em dia", variant: "success" as const }
                  : atraso > 0
                    ? { label: `Em atraso há ${atraso} dia(s)`, variant: "destructive" as const }
                    : { label: "A vencer", variant: "warning" as const };
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.bloco ? `${u.bloco} — ${u.identificacao}` : u.identificacao}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.moradores[0]?.nome ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {resumo?.qtdTitulos ?? 0}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        resumo ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {resumo ? formatCurrencyBRL(resumo.valorTotal) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={situacao.variant}>{situacao.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
