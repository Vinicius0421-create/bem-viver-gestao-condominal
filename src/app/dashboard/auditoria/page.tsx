import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import type { AcaoAuditoria } from "@/generated/prisma/enums";
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
import { FiltroAuditoria } from "@/components/auditoria/filtro-auditoria";
import { DetalhesLogDialog } from "@/components/auditoria/detalhes-log-dialog";
import { formatDatePtBR } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Auditoria" };

const ACAO_VARIANT: Record<string, "success" | "warning" | "destructive" | "muted" | "outline"> = {
  CRIACAO: "success",
  ATUALIZACAO: "outline",
  EXCLUSAO: "destructive",
  PUBLICACAO: "success",
  LOGIN: "muted",
  LOGIN_FALHOU: "destructive",
};
const ACAO_LABEL: Record<string, string> = {
  CRIACAO: "Criação",
  ATUALIZACAO: "Atualização",
  EXCLUSAO: "Exclusão",
  PUBLICACAO: "Publicação",
  LOGIN: "Login",
  LOGIN_FALHOU: "Login falhou",
};
const ENTIDADE_LABEL: Record<string, string> = {
  Condominio: "Condomínio",
  Sindico: "Síndico",
  Fornecedor: "Fornecedor",
  CategoriaFinanceira: "Categoria financeira",
  LancamentoFinanceiro: "Lançamento financeiro",
  TituloFinanceiro: "Título financeiro",
  PrestacaoContas: "Prestação de contas",
  Usuario: "Usuário",
  Unidade: "Unidade",
  Morador: "Morador",
  Documento: "Documento",
  Contrato: "Contrato",
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string; entidade?: string }>;
}) {
  await requireRole("GESTOR");
  const params = await searchParams;

  const where = {
    ...(params.acao ? { acao: params.acao as AcaoAuditoria } : {}),
    ...(params.entidade ? { entidade: params.entidade } : {}),
  };

  const hoje = new Date();
  const ha24h = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);

  const [logs, totalGeral, total24h, totalFalhasLogin] = await Promise.all([
    prisma.logAuditoria.findMany({
      where,
      include: { usuario: { select: { nome: true } } },
      orderBy: { criadoEm: "desc" },
      take: 200,
    }),
    prisma.logAuditoria.count(),
    prisma.logAuditoria.count({ where: { criadoEm: { gte: ha24h } } }),
    prisma.logAuditoria.count({ where: { acao: "LOGIN_FALHOU", criadoEm: { gte: ha24h } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Trilha de ações realizadas no sistema — criações, alterações, exclusões e acessos
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Total de registros</CardDescription>
            <CardTitle>{totalGeral}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Últimas 24 horas</CardDescription>
            <CardTitle>{total24h}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-warning" /> Tentativas de login falhas (24h)
            </CardDescription>
            <CardTitle className={totalFalhasLogin > 0 ? "text-warning" : ""}>
              {totalFalhasLogin}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Registros</CardTitle>
            <CardDescription>
              {logs.length} de {totalGeral} registro(s) — exibindo os mais recentes
            </CardDescription>
          </div>
          <FiltroAuditoria valoresAtuais={params} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum registro encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDatePtBR(log.criadoEm)}{" "}
                    {log.criadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-sm">{log.usuario?.nome ?? "Sistema"}</TableCell>
                  <TableCell>
                    <Badge variant={ACAO_VARIANT[log.acao] ?? "outline"}>
                      {ACAO_LABEL[log.acao] ?? log.acao}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {ENTIDADE_LABEL[log.entidade] ?? log.entidade}
                    {log.entidadeId && (
                      <span className="text-xs text-muted-foreground"> · {log.entidadeId.slice(0, 8)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DetalhesLogDialog dadosAntes={log.dadosAntes} dadosDepois={log.dadosDepois} />
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
