import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { verifySession, papelAtendeMinimo } from "@/lib/dal";
import { excluirMovimentoFundoReserva } from "@/app/actions/fundo-reserva";
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
import {
  MovimentoFundoReservaFormDialog,
  type HistoricoFundoReserva,
  type MovimentoFundoReservaInicial,
} from "@/components/financeiro/movimento-fundo-reserva-form-dialog";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { formatCurrencyBRL, competenciaLabel } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export const metadata: Metadata = { title: "Fundo de Reserva" };

export default async function FundoReservaPage({
  searchParams,
}: {
  searchParams: Promise<{ condominioId?: string }>;
}) {
  const params = await searchParams;
  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "GESTOR");

  const where = params.condominioId ? { condominioId: params.condominioId } : {};

  const [movimentos, condominios] = await Promise.all([
    prisma.movimentoFundoReserva.findMany({
      where,
      include: { condominio: true, criadoPor: true },
      orderBy: [{ condominioId: "asc" }, { competenciaAno: "desc" }, { competenciaMes: "desc" }],
      take: 300,
    }),
    prisma.condominio.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  // Serialização campo a campo — nunca espalhar registros com Decimal
  // direto para um Client Component (ver padrão estabelecido no projeto).
  const historico: HistoricoFundoReserva[] = movimentos.map((m) => ({
    id: m.id,
    condominioId: m.condominioId,
    competenciaMes: m.competenciaMes,
    competenciaAno: m.competenciaAno,
    saldoFinal: m.saldoFinal.toString(),
  }));

  const totalSaldoAtual = (() => {
    // Saldo consolidado = soma do saldo final mais recente de cada
    // condomínio (não a soma de todas as linhas, que dobraria o valor).
    const maisRecentePorCondominio = new Map<string, (typeof movimentos)[number]>();
    for (const m of movimentos) {
      const atual = maisRecentePorCondominio.get(m.condominioId);
      if (
        !atual ||
        m.competenciaAno > atual.competenciaAno ||
        (m.competenciaAno === atual.competenciaAno && m.competenciaMes > atual.competenciaMes)
      ) {
        maisRecentePorCondominio.set(m.condominioId, m);
      }
    }
    return Array.from(maisRecentePorCondominio.values()).reduce(
      (acc, m) => acc + Number(m.saldoFinal),
      0
    );
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Fundo de Reserva
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento mensal de aportes, resgates e rendimento do fundo de reserva de cada
            condomínio
          </p>
        </div>
        {podeEditar && (
          <MovimentoFundoReservaFormDialog
            condominios={condominios}
            historico={historico}
            condominioIdPadrao={params.condominioId}
          />
        )}
      </div>

      <Card>
        <CardHeader className="pb-1">
          <CardDescription>
            Saldo atual consolidado{params.condominioId ? "" : " (todos os condomínios)"}
          </CardDescription>
          <CardTitle>{formatCurrencyBRL(totalSaldoAtual)}</CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimentos</CardTitle>
          <CardDescription>{movimentos.length} movimento(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Condomínio</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead className="text-right">Saldo inicial</TableHead>
                <TableHead className="text-right">Aportes</TableHead>
                <TableHead className="text-right">Resgates</TableHead>
                <TableHead className="text-right">Rendimento</TableHead>
                <TableHead className="text-right">Saldo final</TableHead>
                <TableHead>Registrado por</TableHead>
                {podeEditar && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Nenhum movimento registrado ainda.
                  </TableCell>
                </TableRow>
              )}
              {movimentos.map((m) => {
                const inicial: MovimentoFundoReservaInicial = {
                  id: m.id,
                  condominioId: m.condominioId,
                  competenciaMes: m.competenciaMes,
                  competenciaAno: m.competenciaAno,
                  saldoInicial: m.saldoInicial.toString(),
                  aportes: m.aportes.toString(),
                  resgates: m.resgates.toString(),
                  rendimento: m.rendimento.toString(),
                  observacoes: m.observacoes,
                };
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{m.condominio.nome}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {competenciaLabel(m.competenciaMes, m.competenciaAno)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrencyBRL(m.saldoInicial.toString())}
                    </TableCell>
                    <TableCell className="text-right text-sm text-success">
                      {formatCurrencyBRL(m.aportes.toString())}
                    </TableCell>
                    <TableCell className="text-right text-sm text-destructive">
                      {formatCurrencyBRL(m.resgates.toString())}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrencyBRL(m.rendimento.toString())}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrencyBRL(m.saldoFinal.toString())}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.criadoPor.nome}
                    </TableCell>
                    {podeEditar && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <MovimentoFundoReservaFormDialog
                            condominios={condominios}
                            historico={historico}
                            movimento={inicial}
                          />
                          <ConfirmActionButton
                            action={excluirMovimentoFundoReserva.bind(null, m.id)}
                            titulo="Excluir movimento"
                            descricao={`O movimento de ${competenciaLabel(
                              m.competenciaMes,
                              m.competenciaAno
                            )} de ${m.condominio.nome} será removido permanentemente. Esta ação não pode ser desfeita.`}
                            labelBotao="Excluir"
                            icon={<Trash2 className="h-4 w-4" />}
                          />
                        </div>
                      </TableCell>
                    )}
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
