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
import { Button } from "@/components/ui/button";
import { UnidadeFormDialog } from "@/components/cadastros/unidade-form-dialog";
import { formatCurrencyBRL } from "@/lib/utils";
import { ArrowLeft, Users } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const condominio = await prisma.condominio.findUnique({ where: { id } });
  return { title: condominio ? `Unidades — ${condominio.nome}` : "Unidades" };
}

const STATUS_VARIANT: Record<string, "success" | "muted" | "warning"> = {
  OCUPADA: "success",
  VAGA: "muted",
  EM_OBRAS: "warning",
};
const STATUS_LABEL: Record<string, string> = {
  OCUPADA: "Ocupada",
  VAGA: "Vaga",
  EM_OBRAS: "Em obras",
};

export default async function UnidadesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "GESTOR");

  const condominio = await prisma.condominio.findUnique({ where: { id } });
  if (!condominio) notFound();

  const unidades = await prisma.unidade.findMany({
    where: { condominioId: id },
    orderBy: [{ bloco: "asc" }, { identificacao: "asc" }],
    include: { _count: { select: { moradores: { where: { ativo: true } } } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/condominios/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {condominio.nome}
        </Link>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Unidades</h1>
            <p className="text-sm text-muted-foreground">
              {unidades.length} unidade(s) cadastrada(s) em {condominio.nome}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/condominios/${id}/inadimplencia`}>Ver inadimplência</Link>
            </Button>
            {podeEditar && <UnidadeFormDialog condominioId={id} />}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unidades do condomínio</CardTitle>
          <CardDescription>
            Base para o detalhamento de inadimplência por unidade
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identificação</TableHead>
                <TableHead>Bloco</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Fração ideal</TableHead>
                <TableHead className="text-right">Taxa base</TableHead>
                <TableHead>Moradores</TableHead>
                {podeEditar && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Nenhuma unidade cadastrada ainda.
                  </TableCell>
                </TableRow>
              )}
              {unidades.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.identificacao}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.bloco ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[u.status]}>{STATUS_LABEL[u.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {u.fracaoIdeal ? `${u.fracaoIdeal.toString()}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {u.valorTaxaBase ? formatCurrencyBRL(u.valorTaxaBase.toString()) : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/condominios/${id}/unidades/${u.id}`}>
                        <Users className="h-3.5 w-3.5" />
                        {u._count.moradores === 0
                          ? "Nenhum morador"
                          : `${u._count.moradores} morador(es)`}
                      </Link>
                    </Button>
                  </TableCell>
                  {podeEditar && (
                    <TableCell>
                      <UnidadeFormDialog
                        condominioId={id}
                        unidade={{
                          id: u.id,
                          identificacao: u.identificacao,
                          bloco: u.bloco,
                          fracaoIdeal: u.fracaoIdeal ? u.fracaoIdeal.toString() : null,
                          valorTaxaBase: u.valorTaxaBase ? u.valorTaxaBase.toString() : null,
                          status: u.status,
                        }}
                      />
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
