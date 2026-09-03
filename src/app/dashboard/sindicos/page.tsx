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
import { SindicoFormDialog } from "@/components/cadastros/sindico-form-dialog";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { inativarSindico } from "@/app/actions/sindicos";
import { Ban } from "lucide-react";

export const metadata: Metadata = { title: "Síndicos" };

export default async function SindicosPage() {
  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "GESTOR");
  const podeInativar = papelAtendeMinimo(session.papel, "ADMIN");

  const sindicos = await prisma.sindico.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    include: { condominios: { select: { nome: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Síndicos</h1>
          <p className="text-sm text-muted-foreground">
            {sindicos.length} síndico(s) cadastrado(s)
          </p>
        </div>
        {podeEditar && <SindicoFormDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Síndicos profissionais e moradores</CardTitle>
          <CardDescription>Vinculados aos condomínios geridos pela Bem Viver</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Condomínios</TableHead>
                {podeEditar && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sindicos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum síndico cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {sindicos.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nome}</TableCell>
                  <TableCell>
                    <Badge variant={s.tipo === "PROFISSIONAL" ? "default" : "outline"}>
                      {s.tipo === "PROFISSIONAL" ? "Profissional" : "Morador"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.email ?? s.telefone ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.condominios.map((c) => c.nome).join(", ") || "—"}
                  </TableCell>
                  {podeEditar && (
                    <TableCell className="flex justify-end gap-1 text-right">
                      <SindicoFormDialog
                        sindico={{
                          id: s.id,
                          nome: s.nome,
                          cpf: s.cpf,
                          email: s.email,
                          telefone: s.telefone,
                          tipo: s.tipo,
                        }}
                      />
                      {podeInativar && (
                        <ConfirmActionButton
                          action={inativarSindico.bind(null, s.id)}
                          titulo="Inativar síndico"
                          descricao={`"${s.nome}" deixará de aparecer para vincular a novos condomínios. Condomínios que já apontam para ele continuam funcionando normalmente.`}
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
