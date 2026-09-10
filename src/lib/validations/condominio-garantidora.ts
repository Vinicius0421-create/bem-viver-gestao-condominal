import * as z from "zod";

// Vincular/trocar a garantidora de cobrança de um condomínio (Fase 1 do
// Sistema de Gestão — ver comentário em CondominioGarantidora no schema).
export const CondominioGarantidoraSchema = z.object({
  condominioId: z.string().trim().min(1, { error: "Selecione o condomínio." }),
  garantidoraId: z.string().trim().min(1, { error: "Selecione a garantidora." }),
  taxaAplicada: z.coerce.number().nonnegative().max(100).optional().nullable(),
  observacoes: z.string().trim().optional().or(z.literal("")),
});
export type CondominioGarantidoraFormValues = z.infer<typeof CondominioGarantidoraSchema>;
