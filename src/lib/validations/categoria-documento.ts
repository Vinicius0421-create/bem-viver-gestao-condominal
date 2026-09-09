import * as z from "zod";

export const CategoriaDocumentoSchema = z.object({
  nome: z.string().min(2, { error: "Informe o nome da categoria." }).trim(),
  cor: z.string().trim().optional().or(z.literal("")),
  ordem: z.coerce.number().int().optional().nullable(),
});

export type CategoriaDocumentoFormValues = z.infer<typeof CategoriaDocumentoSchema>;
