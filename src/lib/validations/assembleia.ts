import * as z from "zod";

export const AssembleiaSchema = z.object({
  condominioId: z.string().min(1, { error: "Selecione o condomínio." }).trim(),
  tipo: z.enum(["ORDINARIA", "EXTRAORDINARIA"]),
  dataHora: z.string().min(1, { error: "Informe a data e o horário." }).trim(),
  local: z.string().trim().optional().or(z.literal("")),
  pauta: z.string().min(3, { error: "Descreva a pauta da assembleia." }).trim(),
  observacoes: z.string().trim().optional().or(z.literal("")),
});
export type AssembleiaFormValues = z.infer<typeof AssembleiaSchema>;
