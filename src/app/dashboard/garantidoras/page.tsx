import type { Metadata } from "next";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { GarantidoraFormDialog } from "@/components/cadastros/garantidora-form-dialog";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { alternarAtivoGarantidora } from "@/app/actions/garantidoras";
import { Ban, RotateCcw } from "lucide-react";

export const metadata: Metadata = { title: "Garantidoras" };

export default async function GarantidorasPage({
  searchParams,
}: {
  searchParams: Promise<{ inativos?: string }>;
}) {
  const { inativos } = await searchParams;
  const mostrarInativos = inativos === "1";

  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "GESTOR");
  const podeInativar = papelAtendeMinimo(session.papel, "ADMIN");

  const garantidoras = await prisma.garantidora.findMany({
    where: mostrarInativos ? {} : { ativo: true },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: {
      vinculos: {
        where: { ativo: true },
        include: { condominio: { select: { nome: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Garantidoras</h1>
          <p className="text-sm text-muted-foreground">
            {mostrarInativos
              ? `${garantidoras.length} garantidora(s), incluindo inativas`
              : `${garantidoras.length} garantidora(s) cadastrada(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {podeInativar && (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={mostrarInativos ? "/dashboard/garantidoras" : "/dashboard/garantidoras?inativos=1"}
              >
                {mostrarInativos ? "Ver só ativas" : "Ver inativas"}
              </Link>
            </Button>
          )}
          {podeEditar && <GarantidoraFormDialog />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empresas de garantia/cobrança terceirizada</CardTitle>
          <CardDescription>
            Prestadoras que garantem o repasse aos condomínios mediante taxa sobre a inadimplência
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Taxa padrão</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Condomínios vinculados</TableHead>
                {mostrarInativos && <TableHead>Status</TableHead>}
                {podeEditar && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {garantidoras.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Nenhuma garantidora cadastrada.
                  </TableCell>
                </TableRow>
              )}
              {garantidoras.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{g.cnpj ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {g.taxaPadrao ? `${g.taxaPadrao}%` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {g.email ?? g.telefone ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {g.vinculos.map((v) => v.condominio.nome).join(", ") || "—"}
                  </TableCell>
                  {mostrarInativos && (
                    <TableCell>
                      <Badge variant={g.ativo ? "success" : "muted"}>
                        {g.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                  )}
                  {podeEditar && (
                    <TableCell className="flex justify-end gap-1 text-right">
                      <GarantidoraFormDialog
                        garantidora={{
                          id: g.id,
                          nome: g.nome,
                          cnpj: g.cnpj,
                          taxaPadrao: g.taxaPadrao?.toString() ?? null,
                          telefone: g.telefone,
                          email: g.email,
                          observacoes: g.observacoes,
                        }}
                      />
                      {podeInativar && (
                        <ConfirmActionButton
                          action={alternarAtivoGarantidora.bind(null, g.id, !g.ativo)}
                          titulo={g.ativo ? "Inativar garantidora" : "Reativar garantidora"}
                          descricao={
                            g.ativo
                              ? `"${g.nome}" deixará de aparecer para vincular a novos condomínios. Vínculos já existentes continuam funcionando normalmente.`
                              : `"${g.nome}" voltará a aparecer como opção para vincular a condomínios.`
                          }
                          labelBotao={g.ativo ? "Inativar" : "Reativar"}
                          icon={
                            g.ativo ? (
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
