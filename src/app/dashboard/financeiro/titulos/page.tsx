import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { verifySession, papelAtendeMinimo } from "@/lib/dal";
import { darBaixaTitulo, cancelarTitulo } from "@/app/actions/titulos";
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
import { TituloFormDialog, type TituloInicial } from "@/components/financeiro/titulo-form-dialog";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { formatCurrencyBRL, formatDatePtBR } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = { title: "Contas a Pagar e a Receber" };

function statusVisual(status: string, dataVencimento: Date) {
  if (status === "PENDENTE" && dataVencimento < new Date()) {
    return { label: "Atrasado", variant: "destructive" as const };
  }
  return {
    PENDENTE: { label: "Pendente", variant: "warning" as const },
    PAGO: { label: "Pago/Recebido", variant: "success" as const },
    ATRASADO: { label: "Atrasado", variant: "destructive" as const },
    CANCELADO: { label: "Cancelado", variant: "muted" as const },
  }[status]!;
}

export default async function TitulosPage() {
  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "OPERACIONAL");
  const podeCancelar = papelAtendeMinimo(session.papel, "GESTOR");

  const [titulos, condominios, categorias, fornecedores, unidades] = await Promise.all([
    prisma.tituloFinanceiro.findMany({
      where: { excluidoEm: null, status: { not: "CANCELADO" } },
      include: { condominio: true, fornecedor: true },
      orderBy: { dataVencimento: "asc" },
      take: 200,
    }),
    prisma.condominio.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.categoriaFinanceira.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, tipo: true },
    }),
    prisma.fornecedor.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.unidade.findMany({
      orderBy: [{ bloco: "asc" }, { identificacao: "asc" }],
      select: { id: true, condominioId: true, identificacao: true, bloco: true },
    }),
  ]);

  const aPagar = titulos.filter((t) => t.tipo === "PAGAR");
  const aReceber = titulos.filter((t) => t.tipo === "RECEBER");

  const totalAPagar = aPagar
    .filter((t) => t.status === "PENDENTE")
    .reduce((acc, t) => acc + Number(t.valor), 0);
  const totalAReceber = aReceber
    .filter((t) => t.status === "PENDENTE")
    .reduce((acc, t) => acc + Number(t.valor), 0);
  const totalAtrasados = titulos.filter(
    (t) => t.status === "PENDENTE" && t.dataVencimento < new Date()
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Contas a Pagar e a Receber
          </h1>
          <p className="text-sm text-muted-foreground">
            Compromissos futuros — ao dar baixa, o lançamento financeiro é gerado automaticamente
          </p>
        </div>
        {podeEditar && (
          <TituloFormDialog
            tipoInicial="PAGAR"
            condominios={condominios}
            categorias={categorias}
            fornecedores={fornecedores}
            unidades={unidades}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Total a pagar (pendente)</CardDescription>
            <CardTitle className="text-destructive">{formatCurrencyBRL(totalAPagar)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Total a receber (pendente)</CardDescription>
            <CardTitle className="text-success">{formatCurrencyBRL(totalAReceber)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Títulos em atraso</CardDescription>
            <CardTitle className={totalAtrasados > 0 ? "text-destructive" : ""}>
              {totalAtrasados}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {[
        { titulo: "Contas a Pagar", lista: aPagar },
        { titulo: "Contas a Receber", lista: aReceber },
      ].map((grupo) => (
        <Card key={grupo.titulo}>
          <CardHeader>
            <CardTitle>{grupo.titulo}</CardTitle>
            <CardDescription>{grupo.lista.length} título(s)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Condomínio</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  {podeEditar && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupo.lista.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhum título cadastrado.
                    </TableCell>
                  </TableRow>
                )}
                {grupo.lista.map((t) => {
                  const sv = statusVisual(t.status, t.dataVencimento);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDatePtBR(t.dataVencimento)}
                      </TableCell>
                      <TableCell className="text-sm">{t.condominio.nome}</TableCell>
                      <TableCell>
                        <p className="flex items-center gap-1.5 font-medium">
                          {t.descricao}
                          {t.recorrente && (
                            <Badge variant="outline" className="text-[10px]">
                              recorrente
                            </Badge>
                          )}
                        </p>
                        {t.fornecedor && (
                          <p className="text-xs text-muted-foreground">{t.fornecedor.nome}</p>
                        )}
                        {t.unidadeId && (
                          <p className="text-xs text-muted-foreground">
                            Unidade:{" "}
                            {(() => {
                              const u = unidades.find((un) => un.id === t.unidadeId);
                              return u ? (u.bloco ? `${u.bloco} — ${u.identificacao}` : u.identificacao) : "—";
                            })()}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrencyBRL(t.valor.toString())}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sv.variant}>{sv.label}</Badge>
                      </TableCell>
                      {podeEditar && (
                        <TableCell className="text-right">
                          {t.status === "PENDENTE" && (
                            <div className="flex justify-end gap-1">
                              <TituloFormDialog
                                tipoInicial={t.tipo}
                                condominios={condominios}
                                categorias={categorias}
                                fornecedores={fornecedores}
                                unidades={unidades}
                                titulo={
                                  {
                                    id: t.id,
                                    tipo: t.tipo,
                                    condominioId: t.condominioId,
                                    descricao: t.descricao,
                                    valor: t.valor.toString(),
                                    dataVencimento: t.dataVencimento,
                                    categoriaId: t.categoriaId,
                                    fornecedorId: t.fornecedorId,
                                    unidadeId: t.unidadeId,
                                    recorrente: t.recorrente,
                                    observacoes: t.observacoes,
                                  } satisfies TituloInicial
                                }
                              />
                              <ConfirmActionButton
                                action={darBaixaTitulo.bind(null, t.id)}
                                titulo="Confirmar baixa"
                                descricao={`Confirma que este título foi ${
                                  t.tipo === "PAGAR" ? "pago" : "recebido"
                                }? Um lançamento financeiro será criado automaticamente.`}
                                labelBotao="Dar baixa"
                                icon={<CheckCircle2 className="h-4 w-4" />}
                              />
                              {podeCancelar && (
                                <ConfirmActionButton
                                  action={cancelarTitulo.bind(null, t.id)}
                                  titulo="Cancelar título"
                                  descricao="O título será marcado como cancelado e removido das pendências."
                                  labelBotao="Cancelar título"
                                  icon={<XCircle className="h-4 w-4" />}
                                />
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
