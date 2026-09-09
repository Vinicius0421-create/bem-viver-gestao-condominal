import * as z from "zod";

export const CondominioSchema = z.object({
  nome: z.string().min(2, { error: "Informe o nome do condomínio." }).trim(),
  razaoSocial: z.string().trim().optional().or(z.literal("")),
  cnpj: z.string().trim().optional().or(z.literal("")),
  endereco: z.string().trim().optional().or(z.literal("")),
  cidade: z.string().trim().optional().or(z.literal("")),
  estado: z.string().trim().max(2).optional().or(z.literal("")),
  cep: z.string().trim().optional().or(z.literal("")),
  banco: z.string().trim().optional().or(z.literal("")),
  agencia: z.string().trim().optional().or(z.literal("")),
  conta: z.string().trim().optional().or(z.literal("")),
  qtdUnidades: z.coerce.number().int().nonnegative().optional().nullable(),
  valorHonorarios: z.coerce.number().nonnegative().optional().nullable(),
  diaVencimentoTaxa: z.coerce.number().int().min(1).max(31).optional().nullable(),
  status: z.enum(["ATIVO", "INATIVO", "PROSPECT"]),
  sindicoId: z.string().trim().optional().or(z.literal("")),
  observacoes: z.string().trim().optional().or(z.literal("")),
});

export type CondominioFormValues = z.infer<typeof CondominioSchema>;
