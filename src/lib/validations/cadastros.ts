import * as z from "zod";

export const SindicoSchema = z.object({
  nome: z.string().min(2, { error: "Informe o nome." }).trim(),
  cpf: z.string().trim().optional().or(z.literal("")),
  email: z.email({ error: "E-mail inválido." }).optional().or(z.literal("")),
  telefone: z.string().trim().optional().or(z.literal("")),
  tipo: z.enum(["PROFISSIONAL", "MORADOR"]),
});
export type SindicoFormValues = z.infer<typeof SindicoSchema>;

export const GarantidoraSchema = z.object({
  nome: z.string().min(2, { error: "Informe o nome da garantidora." }).trim(),
  cnpj: z.string().trim().optional().or(z.literal("")),
  taxaPadrao: z.coerce.number().nonnegative().max(100).optional().nullable(),
  telefone: z.string().trim().optional().or(z.literal("")),
  email: z.email({ error: "E-mail inválido." }).optional().or(z.literal("")),
  observacoes: z.string().trim().optional().or(z.literal("")),
});
export type GarantidoraFormValues = z.infer<typeof GarantidoraSchema>;

export const FornecedorSchema = z.object({
  nome: z.string().min(2, { error: "Informe o nome/razão social." }).trim(),
  cnpjCpf: z.string().trim().optional().or(z.literal("")),
  categoria: z.string().trim().optional().or(z.literal("")),
  telefone: z.string().trim().optional().or(z.literal("")),
  email: z.email({ error: "E-mail inválido." }).optional().or(z.literal("")),
  endereco: z.string().trim().optional().or(z.literal("")),
  observacoes: z.string().trim().optional().or(z.literal("")),
});
export type FornecedorFormValues = z.infer<typeof FornecedorSchema>;

export const CategoriaFinanceiraSchema = z.object({
  nome: z.string().min(2, { error: "Informe o nome da categoria." }).trim(),
  tipo: z.enum(["RECEITA", "DESPESA"]),
  natureza: z.enum(["FIXA", "EXTRA", "BANCARIA", "REPASSE"]),
  cor: z.string().trim().optional().or(z.literal("")),
  ordem: z.coerce.number().int().optional().nullable(),
  categoriaPaiId: z.string().trim().optional().or(z.literal("")),
});
export type CategoriaFinanceiraFormValues = z.infer<typeof CategoriaFinanceiraSchema>;

export const UsuarioSchema = z.object({
  nome: z.string().min(2, { error: "Informe o nome." }).trim(),
  email: z.email({ error: "E-mail inválido." }).trim(),
  papel: z.enum(["ADMIN", "GESTOR", "OPERACIONAL"]),
  senha: z
    .string()
    .min(8, { error: "A senha deve ter ao menos 8 caracteres." })
    .optional()
    .or(z.literal("")),
});
export type UsuarioFormValues = z.infer<typeof UsuarioSchema>;

export const UnidadeSchema = z.object({
  identificacao: z.string().min(1, { error: "Informe a identificação da unidade." }).trim(),
  bloco: z.string().trim().optional().or(z.literal("")),
  fracaoIdeal: z.coerce.number().nonnegative().optional().nullable(),
  valorTaxaBase: z.coerce.number().nonnegative().optional().nullable(),
  status: z.enum(["OCUPADA", "VAGA", "EM_OBRAS"]),
});
export type UnidadeFormValues = z.infer<typeof UnidadeSchema>;

export const MoradorSchema = z.object({
  nome: z.string().min(2, { error: "Informe o nome." }).trim(),
  cpf: z.string().trim().optional().or(z.literal("")),
  email: z.email({ error: "E-mail inválido." }).optional().or(z.literal("")),
  telefone: z.string().trim().optional().or(z.literal("")),
  tipoVinculo: z.enum(["PROPRIETARIO", "INQUILINO", "DEPENDENTE"]),
  principal: z.boolean().default(false),
  // Opcional: em branco significa "hoje" na criação, ou "mantém a data
  // já registrada" na edição (ver salvarMorador). Sprint 6 — histórico de
  // vínculo pessoa-unidade.
  dataInicio: z.string().trim().optional().or(z.literal("")),
});
export type MoradorFormValues = z.infer<typeof MoradorSchema>;
