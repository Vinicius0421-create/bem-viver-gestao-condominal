import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { FluxoCaixaChart, type PontoFluxoCaixa } from "@/components/financeiro/fluxo-caixa-chart";
import { formatCurrencyBRL, competenciaLabel, formatDatePtBR, nomeMes } from "@/lib/utils";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  FileClock,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = { title: "Painel Executivo" };

function ultimosMeses(qtd: number) {
  const hoje = new Date();
  const meses: { mes: number; ano: number }[] = [];
  for (let i = qtd - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
  }
  return meses;
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

export default async function DashboardPage() {
  const session = await verifySession();

  const hoje = new Date();
  const em7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
  const em15dias = new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000);
  const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
  const em60dias = new Date(hoje.getTime() + 60 * 24 * 60 * 60 * 1000);
  const periodo = ultimosMeses(6);

  const [
    condominiosAtivos,
    agrupadoMesAtual,
    agrupadoSerie,
    titulosVencendoEm7Dias,
    titulosAtrasados,
    prestacoesPendentes,
    ultimasPrestacoesPublicadasPorCondominio,
    documentosVencendo,
    contratosVencendo,
    assembleiasProximas,
  ] = await Promise.all([
    prisma.condominio.count({ where: { status: "ATIVO" } }),
    prisma.lancamentoFinanceiro.groupBy({
      by: ["tipo"],
      where: {
        excluidoEm: null,
        competenciaMes: hoje.getMonth() + 1,
        competenciaAno: hoje.getFullYear(),
      },
      _sum: { valor: true },
    }),
    prisma.lancamentoFinanceiro.groupBy({
      by: ["competenciaAno", "competenciaMes", "tipo"],
      where: {
        excluidoEm: null,
        OR: periodo.map((p) => ({ competenciaAno: p.ano, competenciaMes: p.mes })),
      },
      _sum: { valor: true },
    }),
    prisma.tituloFinanceiro.findMany({
      where: { excluidoEm: null, status: "PENDENTE", dataVencimento: { gte: hoje, lte: em7dias } },
      include: { condominio: { select: { nome: true } } },
      orderBy: { dataVencimento: "asc" },
      take: 8,
    }),
    prisma.tituloFinanceiro.aggregate({
      where: { excluidoEm: null, status: "PENDENTE", dataVencimento: { lt: hoje } },
      _count: true,
      _sum: { valor: true },
    }),
    prisma.prestacaoContas.findMany({
      where: { status: { in: ["RASCUNHO", "EM_REVISAO"] } },
      include: { condominio: { select: { nome: true } } },
      orderBy: [{ competenciaAno: "desc" }, { competenciaMes: "desc" }],
      take: 8,
    }),
    // PERF-1: o `take: 20` aqui já foi um bug de truncamento silencioso —
    // acima de 20 condomínios ativos, o "Saldo consolidado" do painel
    // passava a somar só os 20 primeiros (por ordem de competência mais
    // recente), subestimando o saldo real sem nenhum aviso visual. Como
    // `distinct: ["condominioId"]` já limita o resultado a no máximo uma
    // linha por condomínio — nunca mais que o total de condomínios
    // cadastrados —, não há necessidade de paginação aqui: essa é uma
    // consulta de agregação para uma soma, não uma listagem para a tela.
    prisma.prestacaoContas.findMany({
      where: { status: "PUBLICADA" },
      include: { condominio: { select: { nome: true } } },
      orderBy: [{ competenciaAno: "desc" }, { competenciaMes: "desc" }],
      distinct: ["condominioId"],
    }),
    prisma.documento.count({
      where: { excluidoEm: null, dataValidade: { not: null, lte: em30dias } },
    }),
    prisma.contrato.count({
      where: { ativo: true, dataFim: { not: null, lte: em60dias } },
    }),
    prisma.assembleia.count({
      where: { status: "AGENDADA", dataHora: { gte: hoje, lte: em15dias } },
    }),
  ]);

  const receitasMesAtual = Number(
    agrupadoMesAtual.find((a) => a.tipo === "RECEITA")?._sum.valor ?? 0
  );
  const despesasMesAtual = Number(
    agrupadoMesAtual.find((a) => a.tipo === "DESPESA")?._sum.valor ?? 0
  );

  const mapa = new Map<string, { receitas: number; despesas: number }>();
  for (const linha of agrupadoSerie) {
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

  const saldoConsolidado = ultimasPrestacoesPublicadasPorCondominio.reduce(
    (acc, p) => acc + Number(p.saldoAtual),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Olá, {session.nome.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada da operação — {competenciaLabel(hoje.getMonth() + 1, hoje.getFullYear())}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-bv-gold-500" /> Condomínios ativos
            </CardDescription>
            <CardTitle>{condominiosAtivos}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-success" /> Receitas do mês
            </CardDescription>
            <CardTitle className="text-success">{formatCurrencyBRL(receitasMesAtual)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" /> Despesas do mês
            </CardDescription>
            <CardTitle className="text-destructive">{formatCurrencyBRL(despesasMesAtual)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-bv-gold-400/40">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-bv-gold-500" /> Saldo consolidado
            </CardDescription>
            <CardTitle className="text-bv-gold-600">{formatCurrencyBRL(saldoConsolidado)}</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Soma do saldo da última prestação publicada de cada condomínio
            </p>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução consolidada (6 meses)</CardTitle>
            <CardDescription>Receitas e despesas somadas de todos os condomínios</CardDescription>
          </CardHeader>
          <CardContent>
            <FluxoCaixaChart dados={serie} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Vencendo nos próximos 7 dias</p>
              <p className="text-lg font-semibold">{titulosVencendoEm7Dias.length} título(s)</p>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs text-muted-foreground">Títulos em atraso</p>
              <p className="text-lg font-semibold text-destructive">
                {titulosAtrasados._count} · {formatCurrencyBRL(Number(titulosAtrasados._sum.valor ?? 0))}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Prestações aguardando ação</p>
              <p className="text-lg font-semibold">{prestacoesPendentes.length}</p>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="text-xs text-muted-foreground">Documentos vencidos/vencendo (30 dias)</p>
              <p className="text-lg font-semibold text-warning">{documentosVencendo}</p>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="text-xs text-muted-foreground">Contratos vencidos/vencendo (60 dias)</p>
              <p className="text-lg font-semibold text-warning">{contratosVencendo}</p>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="text-xs text-muted-foreground">Assembleias agendadas (15 dias)</p>
              <p className="text-lg font-semibold text-warning">{assembleiasProximas}</p>
            </div>
            <Link
              href="/dashboard/financeiro/titulos"
              className="flex items-center justify-center gap-1 text-sm text-bv-gold-600 hover:underline"
            >
              Ver contas a pagar/receber <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/dashboard/documentos"
              className="flex items-center justify-center gap-1 text-sm text-bv-gold-600 hover:underline"
            >
              Ver Central de Documentos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/dashboard/contratos"
              className="flex items-center justify-center gap-1 text-sm text-bv-gold-600 hover:underline"
            >
              Ver Contratos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/dashboard/assembleias"
              className="flex items-center justify-center gap-1 text-sm text-bv-gold-600 hover:underline"
            >
              Ver Assembleias <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-base">
              <FileClock className="h-4 w-4 text-bv-gold-500" />
              Prestações de contas aguardando ação
            </CardTitle>
            <CardDescription>Rascunhos e revisões pendentes de publicação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {prestacoesPendentes.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma prestação pendente — tudo em dia.
              </p>
            )}
            {prestacoesPendentes.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/prestacao-de-contas/${p.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
              >
                <span>
                  <span className="font-medium">{p.condominio.nome}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {competenciaLabel(p.competenciaMes, p.competenciaAno)}
                  </span>
                </span>
                <Badge variant={STATUS_PRESTACAO_VARIANT[p.status]}>
                  {STATUS_PRESTACAO_LABEL[p.status]}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vencimentos próximos (7 dias)</CardTitle>
            <CardDescription>Contas a pagar e a receber</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {titulosVencendoEm7Dias.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum vencimento nos próximos 7 dias.
              </p>
            )}
            {titulosVencendoEm7Dias.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium">{t.descricao}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {t.condominio.nome} · {formatDatePtBR(t.dataVencimento)}
                  </span>
                </span>
                <span className={t.tipo === "PAGAR" ? "text-destructive" : "text-success"}>
                  {formatCurrencyBRL(t.valor.toString())}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
