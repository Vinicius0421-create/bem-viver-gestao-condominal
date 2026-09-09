import * as z from "zod";

export const RepresentanteCondominioSchema = z.object({
  condominioId: z.string().trim().min(1, { error: "Selecione o condomínio." }),
  papel: z.enum(["SUBSINDICO", "CONSELHEIRO", "CONSELHEIRO_PRESIDENTE"]),
  nome: z.string().min(2, { error: "Informe o nome." }).trim(),
  cpf: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().optional().or(z.literal("")),
  telefone: z.string().trim().optional().or(z.literal("")),
  observacoes: z.string().trim().optional().or(z.literal("")),
});

export type RepresentanteCondominioFormValues = z.infer<typeof RepresentanteCondominioSchema>;
