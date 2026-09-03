import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { verifySession, papelAtendeMinimo } from "@/lib/dal";
import { formatCurrencyBRL, competenciaLabel, formatDatePtBR } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
} from "@/components/ui/table";
import { ArrowLeft, FileDown, FileSpreadsheet } from "lucide-react";
import { EditarSaldoAnteriorForm } from "@/components/prestacao-contas/editar-saldo-anterior-form";
import {
  BotaoRecalcular,
  BotaoEnviarRevisao,
  BotaoVoltarRascunho,
  BotaoPublicar,
} from "@/components/prestacao-contas/workflow-actions";
import { ReabrirPrestacaoDialog } from "@/components/prestacao-contas/reabrir-prestacao-dialog";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { excluirPrestacaoContas } from "@/app/actions/prestacao-contas";
import { Trash2 } from "lucide-react";

const STATUS_VARIANT: Record<string, "muted" | "warning" | "success"> = {
  RASCUNHO: "muted",
  EM_REVISAO: "warning",
  PUBLICADA: "success",
};
const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  EM_REVISAO: "Em revisão",
  PUBLICADA: "Publicada",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const prestacao = await prisma.prestacaoContas.findUnique({
    where: { id },
    include: { condominio: true },
  });
  if (!prestacao) return { title: "Prestação de Contas" };
  return {
    title: `${competenciaLabel(prestacao.competenciaMes, prestacao.competenciaAno)} · ${prestacao.condominio.nome}`,
  };
}

function mesAnterior(mes: number, ano: number) {
  return mes === 1 ? { mes: 12, ano: ano - 1 } : { mes: mes - 1, ano };
}

export default async function PrestacaoContasDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "OPERACIONAL");
  const podeAprovar = papelAtendeMinimo(session.papel, "GESTOR");
  const podeAdmin = papelAtendeMinimo(session.papel, "ADMIN");

  const prestacao = await prisma.prestacaoContas.findUnique({
    where: { id },
    include: {
      condominio: true,
      publicadoPor: { select: { nome: true } },
      itens: {
        include: {
          lancamento: { include: { categoria: true, fornecedor: true } },
        },
        orderBy: { lancamento: { dataMovimento: "asc" } },
      },
    },
  });
  if (!prestacao) notFound();

  const anterior = mesAnterior(prestacao.competenciaMes, prestacao.competenciaAno);
  const prestacaoAnteriorExiste = await prisma.prestacaoContas.findUnique({
    where: {
      condominioId_competenciaMes_competenciaAno: {
        condominioId: prestacao.condominioId,
        competenciaMes: anterior.mes,
        competenciaAno: anterior.ano,
      },
    },
    select: { id: true },
  });
  const semSaldoAnteriorEncontrado =
    !prestacaoAnteriorExiste && Number(prestacao.saldoAnterior) === 0;

  const receitas = prestacao.itens.filter((i) => i.lancamento.tipo === "RECEITA");
  const despesas = prestacao.itens.filter((i) => i.lancamento.tipo === "DESPESA");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/prestacao-de-contas"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para prestações de contas
        </Link>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold text-foreground">
                {competenciaLabel(prestacao.competenciaMes, prestacao.competenciaAno)}
              </h1>
              <Badge variant={STATUS_VARIANT[prestacao.status]}>
                {STATUS_LABEL[prestacao.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{prestacao.condominio.nome}</p>
            {prestacao.status === "PUBLICADA" && prestacao.publicadoEm && (
              <p className="mt-1 text-xs text-muted-foreground">
                Publicada em {formatDatePtBR(prestacao.publicadoEm)}
                {prestacao.publicadoPor && ` por ${prestacao.publicadoPor.nome}`}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={`/api/prestacoes/${prestacao.id}/pdf`} target="_blank" rel="noreferrer">
                <FileDown className="h-4 w-4" />
                PDF
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/api/prestacoes/${prestacao.id}/excel`}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Saldo anterior</CardDescription>
            <CardTitle>{formatCurrencyBRL(prestacao.saldoAnterior.toString())}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Receitas</CardDescription>
            <CardTitle className="text-success">
              {formatCurrencyBRL(prestacao.totalReceitas.toString())}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Despesas</CardDescription>
            <CardTitle className="text-destructive">
              {formatCurrencyBRL(prestacao.totalDespesas.toString())}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-bv-gold-400/40">
          <CardHeader className="pb-1">
            <CardDescription>Saldo atual</CardDescription>
            <CardTitle className="text-bv-gold-600">
              {formatCurrencyBRL(prestacao.saldoAtual.toString())}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {prestacao.status === "RASCUNHO" && podeEditar && (
        <Card>
          <CardHeader>
            <CardTitle>Ajustes do rascunho</CardTitle>
            <CardDescription>
              Confira o saldo anterior e recalcule caso novos lançamentos tenham sido adicionados
              nesta competência
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-md flex-1">
              <EditarSaldoAnteriorForm
                id={prestacao.id}
                saldoAnterior={prestacao.saldoAnterior.toString()}
                observacoes={prestacao.observacoes}
                semSaldoAnteriorEncontrado={semSaldoAnteriorEncontrado}
              />
            </div>
            <BotaoRecalcular id={prestacao.id} />
          </CardContent>
        </Card>
      )}

      {prestacao.observacoes && prestacao.status !== "RASCUNHO" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {prestacao.observacoes}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {prestacao.status === "RASCUNHO" && podeEditar && (
          <BotaoEnviarRevisao id={prestacao.id} />
        )}
        {prestacao.status === "EM_REVISAO" && podeAprovar && (
          <>
            <BotaoPublicar id={prestacao.id} />
            <BotaoVoltarRascunho id={prestacao.id} />
          </>
        )}
        {prestacao.status === "PUBLICADA" && podeAdmin && (
          <ReabrirPrestacaoDialog id={prestacao.id} />
        )}
        {prestacao.status === "RASCUNHO" && podeAprovar && (
          <ConfirmActionButton
            action={excluirPrestacaoContas.bind(null, prestacao.id)}
            titulo="Excluir rascunho"
            descricao="O rascunho e seus itens serão excluídos permanentemente. Esta ação não pode ser desfeita."
            labelBotao="Excluir rascunho"
            icon={<Trash2 className="h-4 w-4" />}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receitas</CardTitle>
            <CardDescription>{receitas.length} lançamento(s)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receitas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      Nenhuma receita nesta competência.
                    </TableCell>
                  </TableRow>
                )}
                {receitas.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDatePtBR(item.lancamento.dataMovimento)}
                    </TableCell>
                    <TableCell className="text-sm">{item.lancamento.descricao}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.lancamento.categoria.nome}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-success">
                      {formatCurrencyBRL(item.valorConsiderado.toString())}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Total de receitas</TableCell>
                  <TableCell className="text-right text-success">
                    {formatCurrencyBRL(prestacao.totalReceitas.toString())}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas</CardTitle>
            <CardDescription>{despesas.length} lançamento(s)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      Nenhuma despesa nesta competência.
                    </TableCell>
                  </TableRow>
                )}
                {despesas.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDatePtBR(item.lancamento.dataMovimento)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>{item.lancamento.descricao}</p>
                      {item.lancamento.fornecedor && (
                        <p className="text-xs text-muted-foreground">
                          {item.lancamento.fornecedor.nome}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.lancamento.categoria.nome}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-destructive">
                      {formatCurrencyBRL(item.valorConsiderado.toString())}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Total de despesas</TableCell>
                  <TableCell className="text-right text-destructive">
                    {formatCurrencyBRL(prestacao.totalDespesas.toString())}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
