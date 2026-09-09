import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireRole, papelAtendeMinimo } from "@/lib/dal";
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
import { CategoriaFormDialog } from "@/components/cadastros/categoria-form-dialog";
import { CategoriaDocumentoFormDialog } from "@/components/cadastros/categoria-documento-form-dialog";
import { ConfirmActionButton } from "@/components/shared/confirm-action-button";
import { inativarCategoria } from "@/app/actions/categorias";
import { inativarCategoriaDocumento } from "@/app/actions/categorias-documento";
import { Ban } from "lucide-react";

export const metadata: Metadata = { title: "Categorias" };

const NATUREZA_LABEL: Record<string, string> = {
  FIXA: "Fixa",
  EXTRA: "Extra",
  BANCARIA: "Bancária",
  REPASSE: "Repasse",
};

export default async function CategoriasPage() {
  const session = await requireRole("GESTOR");
  const podeInativar = papelAtendeMinimo(session.papel, "ADMIN");

  const [categorias, categoriasDocumento] = await Promise.all([
    prisma.categoriaFinanceira.findMany({
      where: { ativo: true },
      orderBy: [{ tipo: "asc" }, { ordem: "asc" }, { nome: "asc" }],
    }),
    prisma.categoriaDocumento.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
  ]);

  // Só categorias principais (sem mãe) podem ser escolhidas como mãe de
  // outra — hierarquia de 1 nível só, ver actions/categorias.ts.
  const categoriasPai = categorias
    .filter((c) => !c.categoriaPaiId)
    .map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo }));
  const nomePorId = new Map(categorias.map((c) => [c.id, c.nome]));

  // Mesmo padrão de hierarquia de 1 nível para CategoriaDocumento — ver
  // actions/categorias-documento.ts.
  const categoriasPaiDocumento = categoriasDocumento
    .filter((c) => !c.categoriaPaiId)
    .map((c) => ({ id: c.id, nome: c.nome }));
  const nomePorIdDocumento = new Map(categoriasDocumento.map((c) => [c.id, c.nome]));

  const receitas = categorias.filter((c) => c.tipo === "RECEITA");
  const despesas = categorias.filter((c) => c.tipo === "DESPESA");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Categorias Financeiras
          </h1>
          <p className="text-sm text-muted-foreground">
            Plano de contas utilizado nos lançamentos e prestações de contas
          </p>
        </div>
        <CategoriaFormDialog categoriasPai={categoriasPai} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[
          { titulo: "Receitas", lista: receitas },
          { titulo: "Despesas", lista: despesas },
        ].map((grupo) => (
          <Card key={grupo.titulo}>
            <CardHeader>
              <CardTitle>{grupo.titulo}</CardTitle>
              <CardDescription>{grupo.lista.length} categoria(s)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Natureza</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupo.lista.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell
                        className={`flex items-center gap-2 font-medium ${c.categoriaPaiId ? "pl-6" : ""}`}
                      >
                        {c.categoriaPaiId && (
                          <span className="text-muted-foreground" aria-hidden>
                            ↳
                          </span>
                        )}
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: c.cor ?? "#C9A227" }}
                        />
                        {c.nome}
                        {c.padraoSistema && (
                          <Badge variant="muted" className="ml-1">
                            padrão
                          </Badge>
                        )}
                        {c.categoriaPaiId && (
                          <span className="text-xs text-muted-foreground">
                            de {nomePorId.get(c.categoriaPaiId) ?? "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {NATUREZA_LABEL[c.natureza]}
                      </TableCell>
                      <TableCell className="flex justify-end gap-1 text-right">
                        <CategoriaFormDialog
                          categoria={{
                            id: c.id,
                            nome: c.nome,
                            tipo: c.tipo,
                            natureza: c.natureza,
                            cor: c.cor,
                            ordem: c.ordem,
                            categoriaPaiId: c.categoriaPaiId,
                          }}
                          categoriasPai={categoriasPai}
                        />
                        {podeInativar && !c.padraoSistema && (
                          <ConfirmActionButton
                            action={inativarCategoria.bind(null, c.id)}
                            titulo="Inativar categoria"
                            descricao={`"${c.nome}" deixará de aparecer para novos lançamentos, mas o histórico já lançado com ela é preservado.`}
                            labelBotao="Inativar"
                            icon={<Ban className="h-4 w-4" />}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col justify-between gap-3 pt-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Categorias de Documento
          </h2>
          <p className="text-sm text-muted-foreground">
            Usadas na Central de Documentos para classificar contratos, atas, comprovantes etc.
          </p>
        </div>
        <CategoriaDocumentoFormDialog categoriasPai={categoriasPaiDocumento} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorias ativas</CardTitle>
          <CardDescription>{categoriasDocumento.length} categoria(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriasDocumento.map((c) => (
                <TableRow key={c.id}>
                  <TableCell
                    className={`flex items-center gap-2 font-medium ${c.categoriaPaiId ? "pl-6" : ""}`}
                  >
                    {c.categoriaPaiId && (
                      <span className="text-muted-foreground" aria-hidden>
                        ↳
                      </span>
                    )}
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: c.cor ?? "#b3892f" }}
                    />
                    {c.nome}
                    {c.padraoSistema && (
                      <Badge variant="muted" className="ml-1">
                        padrão
                      </Badge>
                    )}
                    {c.categoriaPaiId && (
                      <span className="text-xs text-muted-foreground">
                        de {nomePorIdDocumento.get(c.categoriaPaiId) ?? "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1 text-right">
                    <CategoriaDocumentoFormDialog
                      categoria={{
                        id: c.id,
                        nome: c.nome,
                        cor: c.cor,
                        ordem: c.ordem,
                        categoriaPaiId: c.categoriaPaiId,
                      }}
                      categoriasPai={categoriasPaiDocumento}
                    />
                    {podeInativar && !c.padraoSistema && (
                      <ConfirmActionButton
                        action={inativarCategoriaDocumento.bind(null, c.id)}
                        titulo="Inativar categoria"
                        descricao={`"${c.nome}" deixará de aparecer para novos documentos, mas o histórico já classificado com ela é preservado.`}
                        labelBotao="Inativar"
                        icon={<Ban className="h-4 w-4" />}
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
