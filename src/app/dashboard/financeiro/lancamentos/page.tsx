import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { verifySession, papelAtendeMinimo } from "@/lib/dal";
import { excluirLancamento } from "@/app/actions/lancamentos";
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
import { LancamentoFormDialog } from "@/components/financeiro/lancamento-form-dialog";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { formatCurrencyBRL, formatDatePtBR } from "@/lib/utils";
import { FiltroFinanceiro } from "@/components/financeiro/filtro-financeiro";

export const metadata: Metadata = { title: "Lançamentos Financeiros" };

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ condominioId?: string; mes?: string; ano?: string }>;
}) {
  const params = await searchParams;
  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "OPERACIONAL");
  const podeExcluir = papelAtendeMinimo(session.papel, "GESTOR");

  const where = {
    excluidoEm: null,
    ...(params.condominioId ? { condominioId: params.condominioId } : {}),
    ...(params.mes ? { competenciaMes: Number(params.mes) } : {}),
    ...(params.ano ? { competenciaAno: Number(params.ano) } : {}),
  };

  const [lancamentos, condominios, categorias, fornecedores] = await Promise.all([
    prisma.lancamentoFinanceiro.findMany({
      where,
      include: { condominio: true, categoria: true, fornecedor: true },
      orderBy: { dataMovimento: "desc" },
      take: 200,
    }),
    prisma.condominio.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.categoriaFinanceira.findMany({
      where: { ativo: true },
      orderBy: [{ tipo: "asc" }, { ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, tipo: true, categoriaPaiId: true },
    }),
    prisma.fornecedor.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const totalReceitas = lancamentos
    .filter((l) => l.tipo === "RECEITA")
    .reduce((acc, l) => acc + Number(l.valor), 0);
  const totalDespesas = lancamentos
    .filter((l) => l.tipo === "DESPESA")
    .reduce((acc, l) => acc + Number(l.valor), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Lançamentos Financeiros
          </h1>
          <p className="text-sm text-muted-foreground">
            Receitas e despesas registradas — base de todo o financeiro e das prestações de contas
          </p>
        </div>
        {podeEditar && (
          <LancamentoFormDialog
            condominios={condominios}
            categorias={categorias}
            fornecedores={fornecedores}
            condominioIdFixo={params.condominioId}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Receitas no filtro atual</CardDescription>
            <CardTitle className="text-success">{formatCurrencyBRL(totalReceitas)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Despesas no filtro atual</CardDescription>
            <CardTitle className="text-destructive">{formatCurrencyBRL(totalDespesas)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Saldo no filtro atual</CardDescription>
            <CardTitle>{formatCurrencyBRL(totalReceitas - totalDespesas)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Movimentações</CardTitle>
            <CardDescription>{lancamentos.length} lançamento(s) encontrado(s)</CardDescription>
          </div>
          <FiltroFinanceiro condominios={condominios} valoresAtuais={params} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Condomínio</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                {(podeEditar || podeExcluir) && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lancamentos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
              {lancamentos.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDatePtBR(l.dataMovimento)}
                  </TableCell>
                  <TableCell className="text-sm">{l.condominio.nome}</TableCell>
                  <TableCell>
                    <p className="font-medium">{l.descricao}</p>
                    {l.fornecedor && (
                      <p className="text-xs text-muted-foreground">{l.fornecedor.nome}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{l.categoria.nome}</Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      l.tipo === "RECEITA" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {l.tipo === "DESPESA" && "-"}
                    {formatCurrencyBRL(l.valor.toString())}
                  </TableCell>
                  {(podeEditar || podeExcluir) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {podeEditar && (
                          <LancamentoFormDialog
                            condominios={condominios}
                            categorias={categorias}
                            fornecedores={fornecedores}
                            lancamento={{
                              id: l.id,
                              condominioId: l.condominioId,
                              categoriaId: l.categoriaId,
                              fornecedorId: l.fornecedorId,
                              tipo: l.tipo,
                              descricao: l.descricao,
                              valor: l.valor.toString(),
                              competenciaMes: l.competenciaMes,
                              competenciaAno: l.competenciaAno,
                              dataMovimento: l.dataMovimento.toISOString().slice(0, 10),
                              formaPagamento: l.formaPagamento,
                              observacoes: l.observacoes,
                            }}
                          />
                        )}
                        {podeExcluir && (
                          <ConfirmActionButton
                            action={excluirLancamento.bind(null, l.id)}
                            titulo="Excluir lançamento"
                            descricao="O lançamento será removido dos relatórios, mas o histórico é mantido para auditoria."
                          />
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
