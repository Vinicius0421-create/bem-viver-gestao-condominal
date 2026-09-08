import * as z from "zod";

export const ContratoSchema = z.object({
  condominioId: z.string().min(1, { error: "Selecione o condomínio." }).trim(),
  fornecedorId: z.string().trim().optional().or(z.literal("")),
  nome: z.string().min(2, { error: "Informe um nome para o contrato." }).trim(),
  tipo: z.string().min(2, { error: "Informe o tipo de serviço/contrato." }).trim(),
  dataInicio: z.string().min(1, { error: "Informe a data de início." }).trim(),
  dataFim: z.string().trim().optional().or(z.literal("")),
  valor: z.coerce.number().nonnegative().optional().nullable(),
  periodicidade: z.string().trim().optional().or(z.literal("")),
  observacoes: z.string().trim().optional().or(z.literal("")),
});
export type ContratoFormValues = z.infer<typeof ContratoSchema>;
