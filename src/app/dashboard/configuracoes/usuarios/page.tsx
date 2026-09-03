import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
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
import { UsuarioFormDialog } from "@/components/cadastros/usuario-form-dialog";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { alternarAtivoUsuario } from "@/app/actions/usuarios";
import { formatDatePtBR } from "@/lib/utils";
import { Ban, RotateCcw } from "lucide-react";

export const metadata: Metadata = { title: "Usuários" };

const PAPEL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERACIONAL: "Operacional",
};

export default async function UsuariosPage() {
  const session = await requireRole("ADMIN");

  // Seleção explícita de campos — nunca buscar `senhaHash` para uma tela
  // que repassa o registro para um Client Component. Selecionar apenas o
  // necessário aqui é a defesa em profundidade: mesmo que o componente de
  // exibição mude no futuro, o hash da senha nunca chega a existir nesta
  // árvore de dados.
  const usuarios = await prisma.usuario.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, email: true, papel: true, ativo: true, ultimoLoginEm: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Colaboradores com acesso ao sistema e seus perfis de permissão
          </p>
        </div>
        <UsuarioFormDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipe Bem Viver</CardTitle>
          <CardDescription>
            Administrador: acesso total · Gestor: financeiro e prestação de contas · Operacional: lançamentos e consultas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.papel === "ADMIN" ? "secondary" : "outline"}>
                      {PAPEL_LABEL[u.papel]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.ultimoLoginEm ? formatDatePtBR(u.ultimoLoginEm) : "Nunca acessou"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.ativo ? "success" : "muted"}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-1 text-right">
                    <UsuarioFormDialog
                      usuario={{ id: u.id, nome: u.nome, email: u.email, papel: u.papel }}
                    />
                    {u.id !== session.userId && (
                      <ConfirmActionButton
                        action={alternarAtivoUsuario.bind(null, u.id, !u.ativo)}
                        titulo={u.ativo ? "Desativar usuário" : "Reativar usuário"}
                        descricao={
                          u.ativo
                            ? `"${u.nome}" não conseguirá mais fazer login no sistema. O histórico de ações continua registrado na Auditoria.`
                            : `"${u.nome}" voltará a conseguir fazer login no sistema.`
                        }
                        labelBotao={u.ativo ? "Desativar" : "Reativar"}
                        icon={
                          u.ativo ? (
                            <Ban className="h-4 w-4" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )
                        }
                      />
                    )}
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
