import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifySession, papelAtendeMinimo } from "@/lib/dal";
import { excluirDocumento } from "@/app/actions/documentos";
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
import { DocumentoFormDialog } from "@/components/documentos/documento-form-dialog";
import { FiltroDocumentos } from "@/components/documentos/filtro-documentos";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { formatDatePtBR } from "@/lib/utils";
import { AlertTriangle, Download, Trash2 } from "lucide-react";

export const metadata: Metadata = { title: "Central de Documentos" };

const DIAS_ALERTA_VENCIMENTO = 30;

function formatarTamanho(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function situacaoValidade(
  dataValidade: Date | null
): { label: string; variant: "destructive" | "warning" | "success" | "muted" } | null {
  if (!dataValidade) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade);
  validade.setHours(0, 0, 0, 0);
  const dias = Math.floor((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (dias < 0) return { label: `Venceu há ${Math.abs(dias)} dia(s)`, variant: "destructive" };
  if (dias <= DIAS_ALERTA_VENCIMENTO) return { label: `Vence em ${dias} dia(s)`, variant: "warning" };
  return { label: `Válido até ${formatDatePtBR(validade)}`, variant: "success" };
}

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ condominioId?: string; categoriaId?: string }>;
}) {
  const params = await searchParams;
  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "GESTOR");

  const where = {
    excluidoEm: null,
    ...(params.condominioId ? { condominioId: params.condominioId } : {}),
    ...(params.categoriaId ? { categoriaId: params.categoriaId } : {}),
  };

  const [documentos, condominios, categorias] = await Promise.all([
    prisma.documento.findMany({
      where,
      include: { condominio: true, enviadoPor: true, categoria: true },
      orderBy: { criadoEm: "desc" },
      take: 300,
    }),
    prisma.condominio.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.categoriaDocumento.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true },
    }),
  ]);

  const limiteAlerta = new Date();
  limiteAlerta.setHours(23, 59, 59, 999);
  limiteAlerta.setDate(limiteAlerta.getDate() + DIAS_ALERTA_VENCIMENTO);
  const vencendoOuVencidos = documentos.filter(
    (d) => d.dataValidade && d.dataValidade <= limiteAlerta
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Central de Documentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Atas, contratos, regimento, comprovantes e comunicados de todos os condomínios
          </p>
        </div>
        {podeEditar && (
          <DocumentoFormDialog
            condominios={condominios}
            categorias={categorias}
            condominioIdPadrao={params.condominioId}
          />
        )}
      </div>

      {vencendoOuVencidos.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">
              {vencendoOuVencidos.length} documento(s) vencido(s) ou vencendo nos próximos{" "}
              {DIAS_ALERTA_VENCIMENTO} dias
            </p>
            <p className="text-muted-foreground">
              {vencendoOuVencidos
                .slice(0, 5)
                .map((d) => `${d.nome} (${d.condominio?.nome ?? "geral"})`)
                .join(" · ")}
              {vencendoOuVencidos.length > 5 && ` e mais ${vencendoOuVencidos.length - 5}...`}
            </p>
          </div>
        </div>
      )}

      <FiltroDocumentos condominios={condominios} categorias={categorias} valoresAtuais={params} />

      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>{documentos.length} documento(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Condomínio</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Enviado por</TableHead>
                <TableHead className="text-right">Tamanho</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Nenhum documento encontrado.
                  </TableCell>
                </TableRow>
              )}
              {documentos.map((d) => {
                const situacao = situacaoValidade(d.dataValidade);
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <p className="font-medium">{d.nome}</p>
                      {d.descricao && (
                        <p className="text-xs text-muted-foreground">{d.descricao}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.condominio?.nome ?? "Geral"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.categoria.nome}</Badge>
                    </TableCell>
                    <TableCell>
                      {situacao ? (
                        <Badge variant={situacao.variant}>{situacao.label}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.enviadoPor.nome}
                      <br />
                      <span className="text-xs">{formatDatePtBR(d.criadoEm)}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatarTamanho(d.tamanhoBytes)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Baixar documento" asChild>
                          <Link href={`/api/documentos/${d.id}/download`} target="_blank">
                            <Download className="h-4 w-4" />
                          </Link>
                        </Button>
                        {podeEditar && (
                          <>
                            <DocumentoFormDialog
                              condominios={condominios}
                              categorias={categorias}
                              documento={{
                                id: d.id,
                                nome: d.nome,
                                descricao: d.descricao,
                                categoriaId: d.categoriaId,
                                dataValidade: d.dataValidade,
                              }}
                            />
                            <ConfirmActionButton
                              action={excluirDocumento.bind(null, d.id)}
                              titulo="Excluir documento"
                              descricao={`O documento "${d.nome}" será removido da Central de Documentos. Esta ação não pode ser desfeita pela interface.`}
                              labelBotao="Excluir"
                              icon={<Trash2 className="h-4 w-4" />}
                            />
                          </>
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
