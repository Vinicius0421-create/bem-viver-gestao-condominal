import * as z from "zod";

export const DocumentoSchema = z.object({
  condominioId: z.string().min(1, { error: "Selecione o condomínio." }).trim(),
  nome: z.string().min(2, { error: "Informe um nome para o documento." }).trim(),
  descricao: z.string().trim().optional().or(z.literal("")),
  categoriaId: z.string().trim().min(1, { error: "Selecione a categoria." }),
  dataValidade: z.string().trim().optional().or(z.literal("")),
});
export type DocumentoFormValues = z.infer<typeof DocumentoSchema>;
