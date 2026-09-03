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
import { FornecedorFormDialog } from "@/components/cadastros/fornecedor-form-dialog";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { inativarFornecedor } from "@/app/actions/fornecedores";
import { Ban } from "lucide-react";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function FornecedoresPage() {
  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "GESTOR");
  const podeInativar = papelAtendeMinimo(session.papel, "ADMIN");

  const fornecedores = await prisma.fornecedor.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">
            {fornecedores.length} fornecedor(es) ativo(s)
          </p>
        </div>
        {podeEditar && <FornecedorFormDialog />}
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
                {podeEditar && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornecedores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
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
                          action={inativarFornecedor.bind(null, f.id)}
                          titulo="Inativar fornecedor"
                          descricao={`"${f.nome}" deixará de aparecer para novos lançamentos, mas o histórico já lançado com ele é preservado.`}
                          labelBotao="Inativar"
                          icon={<Ban className="h-4 w-4" />}
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
