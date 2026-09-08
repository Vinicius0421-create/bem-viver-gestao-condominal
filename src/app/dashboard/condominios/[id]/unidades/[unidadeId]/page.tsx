import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession, papelAtendeMinimo } from "@/lib/dal";
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
import { MoradorFormDialog } from "@/components/cadastros/morador-form-dialog";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { alternarAtivoMorador } from "@/app/actions/moradores";
import { ArrowLeft, Ban, RotateCcw, Star } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; unidadeId: string }>;
}): Promise<Metadata> {
  const { unidadeId } = await params;
  const unidade = await prisma.unidade.findUnique({ where: { id: unidadeId } });
  return { title: unidade ? `Moradores — ${unidade.identificacao}` : "Moradores" };
}

const TIPO_VINCULO_LABEL: Record<string, string> = {
  PROPRIETARIO: "Proprietário",
  INQUILINO: "Inquilino",
  DEPENDENTE: "Dependente",
};

export default async function MoradoresDaUnidadePage({
  params,
}: {
  params: Promise<{ id: string; unidadeId: string }>;
}) {
  const { id, unidadeId } = await params;

  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "GESTOR");
  const podeInativar = papelAtendeMinimo(session.papel, "ADMIN");

  const unidade = await prisma.unidade.findUnique({
    where: { id: unidadeId },
    include: { condominio: { select: { id: true, nome: true } } },
  });
  if (!unidade || unidade.condominio.id !== id) notFound();

  const moradores = await prisma.morador.findMany({
    where: { unidadeId },
    orderBy: [{ ativo: "desc" }, { principal: "desc" }, { nome: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/condominios/${id}/unidades`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Unidades de {unidade.condominio.nome}
        </Link>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Moradores — {unidade.identificacao}
              {unidade.bloco ? ` (Bloco ${unidade.bloco})` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              {moradores.length} morador(es) cadastrado(s)
            </p>
          </div>
          {podeEditar && <MoradorFormDialog condominioId={id} unidadeId={unidadeId} />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Moradores da unidade</CardTitle>
          <CardDescription>Proprietários, inquilinos e dependentes vinculados</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                {podeEditar && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {moradores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum morador cadastrado para esta unidade.
                  </TableCell>
                </TableRow>
              )}
              {moradores.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {m.principal && (
                        <Star className="h-3.5 w-3.5 fill-bv-gold-500 text-bv-gold-500" />
                      )}
                      {m.nome}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{TIPO_VINCULO_LABEL[m.tipoVinculo]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.email ?? m.telefone ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.ativo ? "success" : "muted"}>
                      {m.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  {podeEditar && (
                    <TableCell className="flex justify-end gap-1 text-right">
                      <MoradorFormDialog
                        condominioId={id}
                        unidadeId={unidadeId}
                        morador={{
                          id: m.id,
                          nome: m.nome,
                          cpf: m.cpf,
                          email: m.email,
                          telefone: m.telefone,
                          tipoVinculo: m.tipoVinculo,
                          principal: m.principal,
                        }}
                      />
                      {podeInativar && (
                        <ConfirmActionButton
                          action={alternarAtivoMorador.bind(null, m.id, !m.ativo, id, unidadeId)}
                          titulo={m.ativo ? "Inativar morador" : "Reativar morador"}
                          descricao={
                            m.ativo
                              ? `"${m.nome}" deixará de aparecer como morador ativo desta unidade.`
                              : `"${m.nome}" voltará a aparecer como morador ativo desta unidade.`
                          }
                          labelBotao={m.ativo ? "Inativar" : "Reativar"}
                          icon={
                            m.ativo ? (
                              <Ban className="h-4 w-4" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )
                          }
                        />
                      )}
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
