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
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { ArrowLeft, FileText, RotateCcw, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RepresentanteFormDialog } from "@/components/condominios/representante-form-dialog";
import { ContatoCondominioFormDialog } from "@/components/condominios/contato-condominio-form-dialog";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { alternarAtivoRepresentanteCondominio } from "@/app/actions/representantes-condominio";
import { alternarAtivoContatoCondominio } from "@/app/actions/contatos-condominio";

const PAPEL_REPRESENTANTE_LABEL: Record<string, string> = {
  SUBSINDICO: "Subsíndico",
  CONSELHEIRO_PRESIDENTE: "Presidente do conselho",
  CONSELHEIRO: "Conselheiro",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const condominio = await prisma.condominio.findUnique({ where: { id } });
  return { title: condominio?.nome ?? "Condomínio" };
}

const STATUS_PRESTACAO_VARIANT: Record<string, "muted" | "warning" | "success"> = {
  RASCUNHO: "muted",
  EM_REVISAO: "warning",
  PUBLICADA: "success",
};
const STATUS_PRESTACAO_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  EM_REVISAO: "Em revisão",
  PUBLICADA: "Publicada",
};

export default async function CondominioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "GESTOR");
  const podeInativar = papelAtendeMinimo(session.papel, "ADMIN");

  const condominio = await prisma.condominio.findUnique({
    where: { id },
    include: {
      sindico: true,
      unidades: true,
      representantes: { orderBy: [{ ativo: "desc" }, { papel: "asc" }, { nome: "asc" }] },
      contatos: { orderBy: [{ ativo: "desc" }, { tipo: "asc" }] },
    },
  });
  if (!condominio) notFound();

  const limiteAlertaDocumentos = new Date();
  limiteAlertaDocumentos.setHours(23, 59, 59, 999);
  limiteAlertaDocumentos.setDate(limiteAlertaDocumentos.getDate() + 30);

  const limiteAlertaContratos = new Date();
  limiteAlertaContratos.setHours(23, 59, 59, 999);
  limiteAlertaContratos.setDate(limiteAlertaContratos.getDate() + 60);

  const limiteAlertaAssembleias = new Date();
  limiteAlertaAssembleias.setHours(23, 59, 59, 999);
  limiteAlertaAssembleias.setDate(limiteAlertaAssembleias.getDate() + 15);

  const [
    lancamentosRecentes,
    prestacoes,
    agregados,
    qtdUnidadesCadastradas,
    titulosVencidosPorUnidade,
    qtdDocumentos,
    qtdDocumentosVencendo,
    qtdContratos,
    qtdContratosVencendo,
    qtdAssembleiasAgendadas,
    qtdAssembleiasProximas,
    fundoReservaRecente,
  ] = await Promise.all([
      prisma.lancamentoFinanceiro.findMany({
        where: { condominioId: id, excluidoEm: null },
        include: { categoria: true },
        orderBy: { dataMovimento: "desc" },
        take: 8,
      }),
      prisma.prestacaoContas.findMany({
        where: { condominioId: id },
        orderBy: [{ competenciaAno: "desc" }, { competenciaMes: "desc" }],
        take: 12,
      }),
      prisma.lancamentoFinanceiro.groupBy({
        by: ["tipo"],
        where: { condominioId: id, excluidoEm: null },
        _sum: { valor: true },
      }),
      prisma.unidade.count({ where: { condominioId: id } }),
      prisma.tituloFinanceiro.findMany({
        where: {
          condominioId: id,
          tipo: "RECEBER",
          unidadeId: { not: null },
          status: { in: ["PENDENTE", "ATRASADO"] },
          excluidoEm: null,
          dataVencimento: { lt: new Date() },
        },
        select: { unidadeId: true },
        distinct: ["unidadeId"],
      }),
      prisma.documento.count({ where: { condominioId: id, excluidoEm: null } }),
      prisma.documento.count({
        where: {
          condominioId: id,
          excluidoEm: null,
          dataValidade: { not: null, lte: limiteAlertaDocumentos },
        },
      }),
      prisma.contrato.count({ where: { condominioId: id, ativo: true } }),
      prisma.contrato.count({
        where: {
          condominioId: id,
          ativo: true,
          dataFim: { not: null, lte: limiteAlertaContratos },
        },
      }),
      prisma.assembleia.count({ where: { condominioId: id, status: "AGENDADA" } }),
      prisma.assembleia.count({
        where: {
          condominioId: id,
          status: "AGENDADA",
          dataHora: { lte: limiteAlertaAssembleias },
        },
      }),
      prisma.movimentoFundoReserva.findFirst({
        where: { condominioId: id },
        orderBy: [{ competenciaAno: "desc" }, { competenciaMes: "desc" }],
      }),
    ]);

  const qtdUnidadesInadimplentes = titulosVencidosPorUnidade.length;

  const totalReceitas = Number(
    agregados.find((a) => a.tipo === "RECEITA")?._sum.valor ?? 0
  );
  const totalDespesas = Number(
    agregados.find((a) => a.tipo === "DESPESA")?._sum.valor ?? 0
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/condominios"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Condomínios
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {condominio.nome}
          </h1>
          <Badge variant={condominio.status === "ATIVO" ? "success" : "muted"}>
            {condominio.status}
          </Badge>
        </div>
        {condominio.razaoSocial && (
          <p className="text-sm text-muted-foreground">{condominio.razaoSocial}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {condominio.endereco ?? "Endereço não informado"}
          {condominio.cidade ? ` — ${condominio.cidade}/${condominio.estado ?? ""}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-9">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Síndico responsável</CardDescription>
            <CardTitle className="text-base">
              {condominio.sindico?.nome ?? "Não definido"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Receitas totais registradas</CardDescription>
            <CardTitle className="text-base text-success">
              {formatCurrencyBRL(totalReceitas)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Despesas totais registradas</CardDescription>
            <CardTitle className="text-base text-destructive">
              {formatCurrencyBRL(totalDespesas)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Unidades cadastradas</CardDescription>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">
                {qtdUnidadesCadastradas > 0
                  ? `${qtdUnidadesCadastradas} unidade(s)`
                  : "Nenhuma ainda"}
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/condominios/${id}/unidades`}>Gerenciar</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Unidades inadimplentes</CardDescription>
            <div className="flex items-center justify-between gap-2">
              <CardTitle
                className={`text-base ${qtdUnidadesInadimplentes > 0 ? "text-destructive" : ""}`}
              >
                {qtdUnidadesInadimplentes > 0 ? `${qtdUnidadesInadimplentes} unidade(s)` : "Nenhuma"}
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/condominios/${id}/inadimplencia`}>Ver</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Documentos</CardDescription>
            <div className="flex items-center justify-between gap-2">
              <CardTitle
                className={`text-base ${qtdDocumentosVencendo > 0 ? "text-warning" : ""}`}
              >
                {qtdDocumentos > 0 ? `${qtdDocumentos} documento(s)` : "Nenhum ainda"}
                {qtdDocumentosVencendo > 0 && (
                  <span className="ml-1.5 text-xs font-normal">
                    ({qtdDocumentosVencendo} vencendo)
                  </span>
                )}
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/documentos?condominioId=${id}`}>Ver</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Contratos</CardDescription>
            <div className="flex items-center justify-between gap-2">
              <CardTitle
                className={`text-base ${qtdContratosVencendo > 0 ? "text-warning" : ""}`}
              >
                {qtdContratos > 0 ? `${qtdContratos} contrato(s)` : "Nenhum ainda"}
                {qtdContratosVencendo > 0 && (
                  <span className="ml-1.5 text-xs font-normal">
                    ({qtdContratosVencendo} vencendo)
                  </span>
                )}
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/contratos?condominioId=${id}`}>Ver</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Assembleias</CardDescription>
            <div className="flex items-center justify-between gap-2">
              <CardTitle
                className={`text-base ${qtdAssembleiasProximas > 0 ? "text-warning" : ""}`}
              >
                {qtdAssembleiasAgendadas > 0
                  ? `${qtdAssembleiasAgendadas} agendada(s)`
                  : "Nenhuma agendada"}
                {qtdAssembleiasProximas > 0 && (
                  <span className="ml-1.5 text-xs font-normal">
                    ({qtdAssembleiasProximas} em 15 dias)
                  </span>
                )}
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/assembleias?condominioId=${id}`}>Ver</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Fundo de reserva</CardDescription>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">
                {fundoReservaRecente
                  ? formatCurrencyBRL(fundoReservaRecente.saldoFinal.toString())
                  : "Sem registros"}
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/financeiro/fundo-reserva?condominioId=${id}`}>
                  Gerenciar
                </Link>
              </Button>
            </div>
            {fundoReservaRecente && (
              <p className="text-xs text-muted-foreground">
                {competenciaLabel(
                  fundoReservaRecente.competenciaMes,
                  fundoReservaRecente.competenciaAno
                )}
              </p>
            )}
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Lançamentos recentes</CardTitle>
              <CardDescription>Últimas movimentações financeiras</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/financeiro/lancamentos?condominioId=${id}`}>
                Ver todos
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentosRecentes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      Nenhum lançamento registrado.
                    </TableCell>
                  </TableRow>
                )}
                {lancamentosRecentes.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <p className="font-medium">{l.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDatePtBR(l.dataMovimento)}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {l.categoria.nome}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        l.tipo === "RECEITA" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {l.tipo === "DESPESA" && "-"}
                      {formatCurrencyBRL(l.valor.toString())}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Prestações de contas</CardTitle>
              <CardDescription>Demonstrativos mensais</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/prestacao-de-contas?condominioId=${id}`}>Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {prestacoes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Nenhuma prestação de contas gerada.
                    </TableCell>
                  </TableRow>
                )}
                {prestacoes.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {competenciaLabel(p.competenciaMes, p.competenciaAno)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_PRESTACAO_VARIANT[p.status]}>
                        {STATUS_PRESTACAO_LABEL[p.status]}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        Number(p.saldoAtual) < 0 ? "text-destructive" : "text-success"
                      }`}
                    >
                      {formatCurrencyBRL(p.saldoAtual.toString())}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/prestacao-de-contas/${p.id}`}>
                          <FileText className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Subsíndico e conselho</CardTitle>
              <CardDescription>Representantes do condomínio além do síndico titular</CardDescription>
            </div>
            {podeEditar && <RepresentanteFormDialog condominioId={id} />}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {condominio.representantes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Nenhum subsíndico ou conselheiro cadastrado.
                    </TableCell>
                  </TableRow>
                )}
                {condominio.representantes.map((r) => (
                  <TableRow key={r.id} className={r.ativo ? "" : "opacity-50"}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {PAPEL_REPRESENTANTE_LABEL[r.papel] ?? r.papel}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.telefone ?? r.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      {podeEditar && (
                        <div className="flex justify-end gap-1">
                          <RepresentanteFormDialog
                            condominioId={id}
                            representante={{
                              id: r.id,
                              papel: r.papel,
                              nome: r.nome,
                              cpf: r.cpf,
                              email: r.email,
                              telefone: r.telefone,
                              observacoes: r.observacoes,
                            }}
                          />
                          {podeInativar && (
                            <ConfirmActionButton
                              action={alternarAtivoRepresentanteCondominio.bind(
                                null,
                                r.id,
                                !r.ativo,
                                id
                              )}
                              titulo={r.ativo ? "Encerrar mandato" : "Reativar representante"}
                              descricao={
                                r.ativo
                                  ? "O registro será mantido no histórico, marcado como encerrado."
                                  : "O representante voltará a aparecer como ativo."
                              }
                              labelBotao={r.ativo ? "Encerrar" : "Reativar"}
                              icon={
                                r.ativo ? (
                                  <Archive className="h-4 w-4" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )
                              }
                            />
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Contatos operacionais</CardTitle>
              <CardDescription>Portaria, zeladoria, financeiro e demais contatos</CardDescription>
            </div>
            {podeEditar && <ContatoCondominioFormDialog condominioId={id} />}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {condominio.contatos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Nenhum contato operacional cadastrado.
                    </TableCell>
                  </TableRow>
                )}
                {condominio.contatos.map((c) => (
                  <TableRow key={c.id} className={c.ativo ? "" : "opacity-50"}>
                    <TableCell className="font-medium">{c.tipo}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.nome ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.telefone ?? c.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      {podeEditar && (
                        <div className="flex justify-end gap-1">
                          <ContatoCondominioFormDialog
                            condominioId={id}
                            contato={{
                              id: c.id,
                              tipo: c.tipo,
                              nome: c.nome,
                              email: c.email,
                              telefone: c.telefone,
                              observacoes: c.observacoes,
                            }}
                          />
                          {podeInativar && (
                            <ConfirmActionButton
                              action={alternarAtivoContatoCondominio.bind(
                                null,
                                c.id,
                                !c.ativo,
                                id
                              )}
                              titulo={c.ativo ? "Desativar contato" : "Reativar contato"}
                              descricao={
                                c.ativo
                                  ? "O contato deixará de aparecer como ativo."
                                  : "O contato voltará a aparecer como ativo."
                              }
                              labelBotao={c.ativo ? "Desativar" : "Reativar"}
                              icon={
                                c.ativo ? (
                                  <Archive className="h-4 w-4" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )
                              }
                            />
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
