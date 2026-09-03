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
import { SindicoFormDialog } from "@/components/cadastros/sindico-form-dialog";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { alternarAtivoSindico } from "@/app/actions/sindicos";
import { Ban, RotateCcw } from "lucide-react";

export const metadata: Metadata = { title: "Síndicos" };

export default async function SindicosPage({
  searchParams,
}: {
  searchParams: Promise<{ inativos?: string }>;
}) {
  const { inativos } = await searchParams;
  const mostrarInativos = inativos === "1";

  const session = await verifySession();
  const podeEditar = papelAtendeMinimo(session.papel, "GESTOR");
  const podeInativar = papelAtendeMinimo(session.papel, "ADMIN");

  const sindicos = await prisma.sindico.findMany({
    where: mostrarInativos ? {} : { ativo: true },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: { condominios: { select: { nome: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Síndicos</h1>
          <p className="text-sm text-muted-foreground">
            {mostrarInativos
              ? `${sindicos.length} síndico(s), incluindo inativos`
              : `${sindicos.length} síndico(s) cadastrado(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {podeInativar && (
            <Button variant="outline" size="sm" asChild>
              <Link href={mostrarInativos ? "/dashboard/sindicos" : "/dashboard/sindicos?inativos=1"}>
                {mostrarInativos ? "Ver só ativos" : "Ver inativos"}
              </Link>
            </Button>
          )}
          {podeEditar && <SindicoFormDialog />}
        </div>
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
                {mostrarInativos && <TableHead>Status</TableHead>}
                {podeEditar && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sindicos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
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
                  {mostrarInativos && (
                    <TableCell>
                      <Badge variant={s.ativo ? "success" : "muted"}>
                        {s.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                  )}
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
                          action={alternarAtivoSindico.bind(null, s.id, !s.ativo)}
                          titulo={s.ativo ? "Inativar síndico" : "Reativar síndico"}
                          descricao={
                            s.ativo
                              ? `"${s.nome}" deixará de aparecer para vincular a novos condomínios. Condomínios que já apontam para ele continuam funcionando normalmente.`
                              : `"${s.nome}" voltará a aparecer como opção para vincular a condomínios.`
                          }
                          labelBotao={s.ativo ? "Inativar" : "Reativar"}
                          icon={
                            s.ativo ? (
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
