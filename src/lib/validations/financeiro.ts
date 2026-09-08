import * as z from "zod";

export const LancamentoSchema = z.object({
  condominioId: z.string().min(1, { error: "Selecione o condomínio." }),
  categoriaId: z.string().min(1, { error: "Selecione a categoria." }),
  fornecedorId: z.string().trim().optional().or(z.literal("")),
  tipo: z.enum(["RECEITA", "DESPESA"]),
  descricao: z.string().min(2, { error: "Descreva o lançamento." }).trim(),
  valor: z.coerce.number().positive({ error: "Informe um valor maior que zero." }),
  competenciaMes: z.coerce.number().int().min(1).max(12),
  competenciaAno: z.coerce.number().int().min(2000).max(2100),
  dataMovimento: z.string().min(1, { error: "Informe a data." }),
  formaPagamento: z
    .enum(["PIX", "BOLETO", "TED", "DOC", "DEBITO_AUTOMATICO", "DINHEIRO", "CARTAO", "OUTRO"])
    .optional()
    .nullable(),
  observacoes: z.string().trim().optional().or(z.literal("")),
});
export type LancamentoFormValues = z.infer<typeof LancamentoSchema>;

export const TituloSchema = z.object({
  condominioId: z.string().min(1, { error: "Selecione o condomínio." }),
  tipo: z.enum(["PAGAR", "RECEBER"]),
  descricao: z.string().min(2, { error: "Descreva o título." }).trim(),
  categoriaId: z.string().trim().optional().or(z.literal("")),
  fornecedorId: z.string().trim().optional().or(z.literal("")),
  // Sprint 3: vínculo opcional com a unidade — pré-requisito para o
  // detalhamento de inadimplência por unidade (ver ROADMAP.md). Opcional
  // porque nem todo título "a receber" é uma taxa condominial de uma
  // unidade específica (ex: receita de aluguel de área comum).
  unidadeId: z.string().trim().optional().or(z.literal("")),
  valor: z.coerce.number().positive({ error: "Informe um valor maior que zero." }),
  dataVencimento: z.string().min(1, { error: "Informe o vencimento." }),
  recorrente: z.boolean().default(false),
  observacoes: z.string().trim().optional().or(z.literal("")),
});
export type TituloFormValues = z.infer<typeof TituloSchema>;
