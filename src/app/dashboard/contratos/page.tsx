import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifySession, papelAtendeMinimo } from "@/lib/dal";
import { alternarAtivoContrato } from "@/app/actions/contratos";
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
import { Button } from "@/components/ui/button";
import { ContratoFormDialog } from "@/components/contratos/contrato-form-dialog";
import { FiltroContratos } from "@/components/contratos/filtro-contratos";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { formatCurrencyBRL, formatDatePtBR } from "@/lib/utils";
import { AlertTriangle, Download, Ban, RotateCcw } from "lucide-react";

export const metadata: Metadata = { title: "Contratos" };

// Contratos têm um ciclo de renovação mais longo que documentos avulsos
// (Documento usa 30 dias — ver /dashboard/documentos) — um aviso de
// vencimento com mais antecedência dá tempo real para negociar renovação
// ou nova licitação antes do serviço ser interrompido.
const DIAS_ALERTA_VENCIMENTO = 60;

function situacaoVencimento(
  dataFim: Date | null
): { label: string; variant: "destructive" | "warning" | "success" | "muted" } | null {
  if (!dataFim) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(dataFim);
  fim.setHours(0, 0, 0, 0);
  const dias = Math.floor((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (dias < 0) return { label: `Vencido há ${Math.abs(dias)} dia(s)`, variant: "destructive" };
  if (dias <= DIAS_ALERTA_VENCIMENTO) return { label: `Vence em ${dias} dia(s)`, variant: "warning" };
  return { label: `Até ${formatDatePtBR(fim)}`, variant: "success" };
}

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ condominioId?: string; inativos?: string }>;
}) {
  const params = await searchParams;
  const mostrarInativos = params.inativos === "1";

  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "GESTOR");
  const podeInativar = papelAtendeMinimo(session.papel, "ADMIN");

  const where = {
    ...(mostrarInativos ? {} : { ativo: true }),
    ...(params.condominioId ? { condominioId: params.condominioId } : {}),
  };

  const [contratos, condominios, fornecedores] = await Promise.all([
    prisma.contrato.findMany({
      where,
      include: { condominio: true, fornecedor: true },
      orderBy: [{ ativo: "desc" }, { dataFim: "asc" }],
      take: 300,
    }),
    prisma.condominio.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.fornecedor.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const limiteAlerta = new Date();
  limiteAlerta.setHours(23, 59, 59, 999);
  limiteAlerta.setDate(limiteAlerta.getDate() + DIAS_ALERTA_VENCIMENTO);
  const vencendoOuVencidos = contratos.filter(
    (c) => c.ativo && c.dataFim && c.dataFim <= limiteAlerta
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Contratos com fornecedores e prestadores de serviço de todos os condomínios
          </p>
        </div>
        <div className="flex items-center gap-2">
          {podeInativar && (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={{
                  pathname: "/dashboard/contratos",
                  query: {
                    ...(params.condominioId ? { condominioId: params.condominioId } : {}),
                    ...(mostrarInativos ? {} : { inativos: "1" }),
                  },
                }}
              >
                {mostrarInativos ? "Ver só ativos" : "Ver inativos"}
              </Link>
            </Button>
          )}
          {podeEditar && (
            <ContratoFormDialog
              condominios={condominios}
              fornecedores={fornecedores}
              condominioIdPadrao={params.condominioId}
            />
          )}
        </div>
      </div>

      {vencendoOuVencidos.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">
              {vencendoOuVencidos.length} contrato(s) vencido(s) ou vencendo nos próximos{" "}
              {DIAS_ALERTA_VENCIMENTO} dias
            </p>
            <p className="text-muted-foreground">
              {vencendoOuVencidos
                .slice(0, 5)
                .map((c) => `${c.nome} (${c.condominio.nome})`)
                .join(" · ")}
              {vencendoOuVencidos.length > 5 && ` e mais ${vencendoOuVencidos.length - 5}...`}
            </p>
          </div>
        </div>
      )}

      <FiltroContratos condominios={condominios} valoresAtuais={params} />

      <Card>
        <CardHeader>
          <CardTitle>Contratos</CardTitle>
          <CardDescription>
            {mostrarInativos
              ? `${contratos.length} contrato(s), incluindo inativos`
              : `${contratos.length} contrato(s) ativo(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Condomínio</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                {mostrarInativos && <TableHead>Status</TableHead>}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contratos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Nenhum contrato encontrado.
                  </TableCell>
                </TableRow>
              )}
              {contratos.map((c) => {
                const situacao = situacaoVencimento(c.dataFim);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.tipo}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.condominio.nome}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.fornecedor?.nome ?? "—"}
                    </TableCell>
                    <TableCell>
                      {situacao ? (
                        <Badge variant={situacao.variant}>{situacao.label}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Indeterminado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {c.valor ? formatCurrencyBRL(c.valor.toString()) : "—"}
                    </TableCell>
                    {mostrarInativos && (
                      <TableCell>
                        <Badge variant={c.ativo ? "success" : "muted"}>
                          {c.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {c.arquivoUrl && (
                          <Button variant="ghost" size="icon" aria-label="Baixar arquivo" asChild>
                            <Link href={`/api/contratos/${c.id}/download`} target="_blank">
                              <Download className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {podeEditar && (
                          <ContratoFormDialog
                            condominios={condominios}
                            fornecedores={fornecedores}
                            contrato={{
                              id: c.id,
                              condominioId: c.condominioId,
                              fornecedorId: c.fornecedorId,
                              nome: c.nome,
                              tipo: c.tipo,
                              dataInicio: c.dataInicio,
                              dataFim: c.dataFim,
                              valor: c.valor ? c.valor.toString() : null,
                              periodicidade: c.periodicidade,
                              observacoes: c.observacoes,
                            }}
                          />
                        )}
                        {podeInativar && (
                          <ConfirmActionButton
                            action={alternarAtivoContrato.bind(null, c.id, !c.ativo)}
                            titulo={c.ativo ? "Inativar contrato" : "Reativar contrato"}
                            descricao={
                              c.ativo
                                ? `O contrato "${c.nome}" deixará de aparecer nos alertas de vencimento, mas o histórico é preservado.`
                                : `O contrato "${c.nome}" voltará a aparecer na lista e nos alertas de vencimento.`
                            }
                            labelBotao={c.ativo ? "Inativar" : "Reativar"}
                            icon={
                              c.ativo ? (
                                <Ban className="h-4 w-4" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )
                            }
                          />
                        )}
                      </div>
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
