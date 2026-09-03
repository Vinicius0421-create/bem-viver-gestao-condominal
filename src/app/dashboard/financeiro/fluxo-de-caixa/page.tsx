import type { Metadata } from "next";
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
import { SeletorCondominioPeriodo } from "@/components/financeiro/seletor-condominio-periodo";
import { FluxoCaixaChart, type PontoFluxoCaixa } from "@/components/financeiro/fluxo-caixa-chart";
import { formatCurrencyBRL, nomeMes, competenciaLabel } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "Fluxo de Caixa" };

function ultimosMeses(qtd: number) {
  const hoje = new Date();
  const meses: { mes: number; ano: number }[] = [];
  for (let i = qtd - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
  }
  return meses;
}

export default async function FluxoDeCaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ condominioId?: string; meses?: string }>;
}) {
  const params = await searchParams;
  await verifySession();

  const qtdMeses = [6, 12, 24].includes(Number(params.meses)) ? Number(params.meses) : 12;
  const periodo = ultimosMeses(qtdMeses);
  const primeiroMes = periodo[0];
  const ultimoMes = periodo[periodo.length - 1];

  const filtroCondominio = params.condominioId ? { condominioId: params.condominioId } : {};

  const hoje = new Date();
  const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
  const em60dias = new Date(hoje.getTime() + 60 * 24 * 60 * 60 * 1000);

  const [condominios, agrupado, tituloPendentes] = await Promise.all([
    prisma.condominio.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.lancamentoFinanceiro.groupBy({
      by: ["competenciaAno", "competenciaMes", "tipo"],
      where: {
        excluidoEm: null,
        ...filtroCondominio,
        OR: periodo.map((p) => ({ competenciaAno: p.ano, competenciaMes: p.mes })),
      },
      _sum: { valor: true },
    }),
    prisma.tituloFinanceiro.findMany({
      where: {
        excluidoEm: null,
        status: "PENDENTE",
        ...filtroCondominio,
        dataVencimento: { lte: em60dias },
      },
      select: { tipo: true, valor: true, dataVencimento: true },
    }),
  ]);

  const mapa = new Map<string, { receitas: number; despesas: number }>();
  for (const linha of agrupado) {
    const chave = `${linha.competenciaAno}-${linha.competenciaMes}`;
    const atual = mapa.get(chave) ?? { receitas: 0, despesas: 0 };
    const valor = Number(linha._sum.valor ?? 0);
    if (linha.tipo === "RECEITA") atual.receitas += valor;
    else atual.despesas += valor;
    mapa.set(chave, atual);
  }

  const serie: PontoFluxoCaixa[] = periodo.reduce<PontoFluxoCaixa[]>((acc, p) => {
    const chave = `${p.ano}-${p.mes}`;
    const valores = mapa.get(chave) ?? { receitas: 0, despesas: 0 };
    const saldoMes = valores.receitas - valores.despesas;
    const acumuladoAnterior = acc.length > 0 ? acc[acc.length - 1].saldoAcumulado : 0;
    acc.push({
      competencia: `${nomeMes(p.mes).slice(0, 3)}/${String(p.ano).slice(2)}`,
      receitas: valores.receitas,
      despesas: valores.despesas,
      saldoMes,
      saldoAcumulado: Number((acumuladoAnterior + saldoMes).toFixed(2)),
    });
    return acc;
  }, []);

  const totalReceitasPeriodo = serie.reduce((acc, p) => acc + p.receitas, 0);
  const totalDespesasPeriodo = serie.reduce((acc, p) => acc + p.despesas, 0);
  const resultadoPeriodo = totalReceitasPeriodo - totalDespesasPeriodo;

  const previsto30 = {
    receber: tituloPendentes
      .filter((t) => t.tipo === "RECEBER" && t.dataVencimento <= em30dias)
      .reduce((acc, t) => acc + Number(t.valor), 0),
    pagar: tituloPendentes
      .filter((t) => t.tipo === "PAGAR" && t.dataVencimento <= em30dias)
      .reduce((acc, t) => acc + Number(t.valor), 0),
  };
  const previsto60 = {
    receber: tituloPendentes
      .filter((t) => t.tipo === "RECEBER")
      .reduce((acc, t) => acc + Number(t.valor), 0),
    pagar: tituloPendentes
      .filter((t) => t.tipo === "PAGAR")
      .reduce((acc, t) => acc + Number(t.valor), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">
            Evolução de receitas e despesas de {competenciaLabel(primeiroMes.mes, primeiroMes.ano)}{" "}
            a {competenciaLabel(ultimoMes.mes, ultimoMes.ano)}, com projeção de compromissos futuros
          </p>
        </div>
        <SeletorCondominioPeriodo
          condominios={condominios}
          valoresAtuais={{ condominioId: params.condominioId, meses: params.meses }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-success" /> Receitas no período
            </CardDescription>
            <CardTitle className="text-success">{formatCurrencyBRL(totalReceitasPeriodo)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" /> Despesas no período
            </CardDescription>
            <CardTitle className="text-destructive">{formatCurrencyBRL(totalDespesasPeriodo)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-bv-gold-500" /> Resultado do período
            </CardDescription>
            <CardTitle className={resultadoPeriodo >= 0 ? "text-success" : "text-destructive"}>
              {formatCurrencyBRL(resultadoPeriodo)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-bv-gold-500" /> Previsto próx. 30 dias
            </CardDescription>
            <CardTitle>
              <span className="text-success">{formatCurrencyBRL(previsto30.receber)}</span>
              <span className="mx-1 text-sm font-normal text-muted-foreground">/</span>
              <span className="text-destructive">{formatCurrencyBRL(previsto30.pagar)}</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução mensal</CardTitle>
          <CardDescription>
            Barras: receitas e despesas realizadas por mês. Linha: variação acumulada no período
            exibido (não representa o saldo total em conta, apenas o resultado acumulado desde o
            início da série).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FluxoCaixaChart dados={serie} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projeção de compromissos (próximos 60 dias)</CardTitle>
          <CardDescription>
            Baseada em títulos financeiros pendentes cadastrados em Contas a Pagar/Receber
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total a receber (pendente)</p>
            <p className="text-xl font-semibold text-success">
              {formatCurrencyBRL(previsto60.receber)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total a pagar (pendente)</p>
            <p className="text-xl font-semibold text-destructive">
              {formatCurrencyBRL(previsto60.pagar)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento mensal</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead className="text-right">Receitas</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Resultado do mês</TableHead>
                <TableHead className="text-right">Acumulado no período</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodo.map((p, i) => (
                <TableRow key={`${p.ano}-${p.mes}`}>
                  <TableCell className="font-medium">{competenciaLabel(p.mes, p.ano)}</TableCell>
                  <TableCell className="text-right text-success">
                    {formatCurrencyBRL(serie[i].receitas)}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {formatCurrencyBRL(serie[i].despesas)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      serie[i].saldoMes >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatCurrencyBRL(serie[i].saldoMes)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrencyBRL(serie[i].saldoAcumulado)}
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
