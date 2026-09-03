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
import { FornecedorFormDialog } from "@/components/cadastros/fornecedor-form-dialog";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { alternarAtivoFornecedor } from "@/app/actions/fornecedores";
import { Ban, RotateCcw } from "lucide-react";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function FornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ inativos?: string }>;
}) {
  const { inativos } = await searchParams;
  const mostrarInativos = inativos === "1";

  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "GESTOR");
  const podeInativar = papelAtendeMinimo(session.papel, "ADMIN");

  const fornecedores = await prisma.fornecedor.findMany({
    where: mostrarInativos ? {} : { ativo: true },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">
            {mostrarInativos
              ? `${fornecedores.length} fornecedor(es), incluindo inativos`
              : `${fornecedores.length} fornecedor(es) ativo(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {podeInativar && (
            <Button variant="outline" size="sm" asChild>
              <Link href={mostrarInativos ? "/dashboard/fornecedores" : "/dashboard/fornecedores?inativos=1"}>
                {mostrarInativos ? "Ver só ativos" : "Ver inativos"}
              </Link>
            </Button>
          )}
          {podeEditar && <FornecedorFormDialog />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fornecedores e prestadores de serviço</CardTitle>
          <CardDescription>Concessionárias, empresas terceirizadas e parceiros</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Contato</TableHead>
                {mostrarInativos && <TableHead>Status</TableHead>}
                {podeEditar && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornecedores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum fornecedor cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {fornecedores.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {f.categoria ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {f.telefone ?? f.email ?? "—"}
                  </TableCell>
                  {mostrarInativos && (
                    <TableCell>
                      <Badge variant={f.ativo ? "success" : "muted"}>
                        {f.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                  )}
                  {podeEditar && (
                    <TableCell className="flex justify-end gap-1 text-right">
                      <FornecedorFormDialog
                        fornecedor={{
                          id: f.id,
                          nome: f.nome,
                          cnpjCpf: f.cnpjCpf,
                          categoria: f.categoria,
                          telefone: f.telefone,
                          email: f.email,
                          endereco: f.endereco,
                          observacoes: f.observacoes,
                        }}
                      />
                      {podeInativar && (
                        <ConfirmActionButton
                          action={alternarAtivoFornecedor.bind(null, f.id, !f.ativo)}
                          titulo={f.ativo ? "Inativar fornecedor" : "Reativar fornecedor"}
                          descricao={
                            f.ativo
                              ? `"${f.nome}" deixará de aparecer para novos lançamentos, mas o histórico já lançado com ele é preservado.`
                              : `"${f.nome}" voltará a aparecer como opção para novos lançamentos e títulos.`
                          }
                          labelBotao={f.ativo ? "Inativar" : "Reativar"}
                          icon={
                            f.ativo ? (
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
