import Link from "next/link";
import type { Metadata } from "next";
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
import { CondominioFormDialog } from "@/components/condominios/condominio-form-dialog";
import { formatCurrencyBRL } from "@/lib/utils";

export const metadata: Metadata = { title: "Condomínios" };

const STATUS_VARIANT: Record<string, "success" | "muted" | "warning"> = {
  ATIVO: "success",
  INATIVO: "muted",
  PROSPECT: "warning",
};

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  PROSPECT: "Prospecção",
};

export default async function CondominiosPage() {
  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "GESTOR");

  const [condominios, sindicos] = await Promise.all([
    prisma.condominio.findMany({
      orderBy: { nome: "asc" },
      include: { sindico: true },
    }),
    prisma.sindico.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Condomínios
          </h1>
          <p className="text-sm text-muted-foreground">
            {condominios.length} condomínio(s) cadastrado(s)
          </p>
        </div>
        {podeEditar && <CondominioFormDialog sindicos={sindicos} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Carteira de condomínios</CardTitle>
          <CardDescription>
            Clique em um condomínio para ver detalhes, financeiro e prestações de contas.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Condomínio</TableHead>
                <TableHead>Síndico</TableHead>
                <TableHead>Honorários</TableHead>
                <TableHead>Status</TableHead>
                {podeEditar && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {condominios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum condomínio cadastrado ainda.
                  </TableCell>
                </TableRow>
              )}
              {condominios.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/condominios/${c.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {c.nome}
                    </Link>
                    {c.cidade && (
                      <p className="text-xs font-normal text-muted-foreground">
                        {c.cidade}
                        {c.estado ? `/${c.estado}` : ""}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{c.sindico?.nome ?? "—"}</TableCell>
                  <TableCell>
                    {c.valorHonorarios ? formatCurrencyBRL(c.valorHonorarios.toString()) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                  </TableCell>
                  {podeEditar && (
                    <TableCell className="text-right">
                      <CondominioFormDialog
                        sindicos={sindicos}
                        condominio={{
                          id: c.id,
                          nome: c.nome,
                          cnpj: c.cnpj,
                          endereco: c.endereco,
                          cidade: c.cidade,
                          estado: c.estado,
                          cep: c.cep,
                          banco: c.banco,
                          agencia: c.agencia,
                          conta: c.conta,
                          qtdUnidades: c.qtdUnidades,
                          valorHonorarios: c.valorHonorarios?.toString() ?? null,
                          diaVencimentoTaxa: c.diaVencimentoTaxa,
                          status: c.status,
                          sindicoId: c.sindicoId,
                          observacoes: c.observacoes,
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
