import * as z from "zod";

export const ContatoCondominioSchema = z.object({
  condominioId: z.string().trim().min(1, { error: "Selecione o condomínio." }),
  tipo: z.string().min(2, { error: "Informe o tipo de contato (ex: Portaria, Zelador)." }).trim(),
  nome: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().optional().or(z.literal("")),
  telefone: z.string().trim().optional().or(z.literal("")),
  observacoes: z.string().trim().optional().or(z.literal("")),
});

export type ContatoCondominioFormValues = z.infer<typeof ContatoCondominioSchema>;
