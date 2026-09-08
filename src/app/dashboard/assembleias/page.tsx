import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifySession, papelAtendeMinimo } from "@/lib/dal";
import { atualizarStatusAssembleia } from "@/app/actions/assembleias";
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
import { AssembleiaFormDialog } from "@/components/assembleias/assembleia-form-dialog";
import { FiltroAssembleias } from "@/components/assembleias/filtro-assembleias";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { formatDatePtBR } from "@/lib/utils";
import type { StatusAssembleia } from "@/generated/prisma/enums";
import { AlertTriangle, Download, CheckCircle2, Ban, RotateCcw } from "lucide-react";

export const metadata: Metadata = { title: "Assembleias" };

// Aviso com bastante antecedência (comparado aos 30/60 dias de
// Documentos/Contratos) porque convocar uma assembleia exige prazo mínimo
// de edital/convocação — 15 dias dá tempo real de providenciar isso, sem
// virar ruído para reuniões ainda muito distantes.
const DIAS_ALERTA_PROXIMA = 15;

const TIPO_LABEL: Record<string, string> = {
  ORDINARIA: "Ordinária",
  EXTRAORDINARIA: "Extraordinária",
};

const STATUS_LABEL: Record<string, string> = {
  AGENDADA: "Agendada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
};

const STATUS_VARIANT: Record<string, "warning" | "success" | "muted"> = {
  AGENDADA: "warning",
  REALIZADA: "success",
  CANCELADA: "muted",
};

function formatDataHora(data: Date) {
  return `${formatDatePtBR(data)} às ${data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default async function AssembleiasPage({
  searchParams,
}: {
  searchParams: Promise<{ condominioId?: string; status?: string }>;
}) {
  const params = await searchParams;

  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "GESTOR");
  const podeGerenciarStatus = papelAtendeMinimo(session.papel, "ADMIN");

  const where = {
    ...(params.condominioId ? { condominioId: params.condominioId } : {}),
    ...(params.status ? { status: params.status as StatusAssembleia } : {}),
  };

  const [assembleias, condominios] = await Promise.all([
    prisma.assembleia.findMany({
      where,
      include: { condominio: true },
      orderBy: [{ dataHora: "desc" }],
      take: 300,
    }),
    prisma.condominio.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  const hoje = new Date();
  const limiteProxima = new Date(hoje.getTime() + DIAS_ALERTA_PROXIMA * 24 * 60 * 60 * 1000);
  const proximas = assembleias.filter(
    (a) => a.status === "AGENDADA" && a.dataHora >= hoje && a.dataHora <= limiteProxima
  );
  const pendentesDeRegistro = assembleias.filter(
    (a) => a.status === "AGENDADA" && a.dataHora < hoje
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Assembleias</h1>
          <p className="text-sm text-muted-foreground">
            Assembleias ordinárias e extraordinárias de todos os condomínios
          </p>
        </div>
        {podeEditar && <AssembleiaFormDialog condominios={condominios} condominioIdPadrao={params.condominioId} />}
      </div>

      {proximas.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">
              {proximas.length} assembleia(s) agendada(s) nos próximos {DIAS_ALERTA_PROXIMA} dias
            </p>
            <p className="text-muted-foreground">
              {proximas
                .slice(0, 5)
                .map((a) => `${a.condominio.nome} (${formatDataHora(a.dataHora)})`)
                .join(" · ")}
              {proximas.length > 5 && ` e mais ${proximas.length - 5}...`}
            </p>
          </div>
        </div>
      )}

      {pendentesDeRegistro.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {pendentesDeRegistro.length} assembleia(s) com data já passada e ainda marcada(s)
              como &quot;Agendada&quot;
            </p>
            <p className="text-muted-foreground">
              Marque como realizada (com ou sem ata) ou cancele para manter o registro em dia.
            </p>
          </div>
        </div>
      )}

      <FiltroAssembleias condominios={condominios} valoresAtuais={params} />

      <Card>
        <CardHeader>
          <CardTitle>Assembleias</CardTitle>
          <CardDescription>{assembleias.length} assembleia(s) encontrada(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Condomínio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data/hora</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assembleias.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhuma assembleia encontrada.
                  </TableCell>
                </TableRow>
              )}
              {assembleias.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.condominio.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {TIPO_LABEL[a.tipo]}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDataHora(a.dataHora)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.local ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {a.arquivoUrl && (
                        <Button variant="ghost" size="icon" aria-label="Baixar ata" asChild>
                          <Link href={`/api/assembleias/${a.id}/download`} target="_blank">
                            <Download className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {podeEditar && (
                        <AssembleiaFormDialog
                          condominios={condominios}
                          assembleia={{
                            id: a.id,
                            condominioId: a.condominioId,
                            tipo: a.tipo,
                            dataHora: a.dataHora,
                            local: a.local,
                            pauta: a.pauta,
                            observacoes: a.observacoes,
                          }}
                        />
                      )}
                      {podeGerenciarStatus && a.status === "AGENDADA" && (
                        <>
                          <ConfirmActionButton
                            action={atualizarStatusAssembleia.bind(
                              null,
                              a.id,
                              "REALIZADA",
                              a.condominioId
                            )}
                            titulo="Marcar como realizada"
                            descricao={`Confirma que a assembleia de "${a.condominio.nome}" já aconteceu? Você pode anexar a ata depois, editando o registro.`}
                            labelBotao="Marcar como realizada"
                            icon={<CheckCircle2 className="h-4 w-4" />}
                          />
                          <ConfirmActionButton
                            action={atualizarStatusAssembleia.bind(
                              null,
                              a.id,
                              "CANCELADA",
                              a.condominioId
                            )}
                            titulo="Cancelar assembleia"
                            descricao={`A assembleia de "${a.condominio.nome}" será marcada como cancelada. Isso pode ser desfeito depois.`}
                            labelBotao="Cancelar"
                            icon={<Ban className="h-4 w-4" />}
                          />
                        </>
                      )}
                      {podeGerenciarStatus && a.status !== "AGENDADA" && (
                        <ConfirmActionButton
                          action={atualizarStatusAssembleia.bind(
                            null,
                            a.id,
                            "AGENDADA",
                            a.condominioId
                          )}
                          titulo="Reabrir assembleia"
                          descricao={`A assembleia de "${a.condominio.nome}" volta para o status "Agendada". Use apenas para corrigir um engano.`}
                          labelBotao="Reabrir"
                          icon={<RotateCcw className="h-4 w-4" />}
                        />
                      )}
                    </div>
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
