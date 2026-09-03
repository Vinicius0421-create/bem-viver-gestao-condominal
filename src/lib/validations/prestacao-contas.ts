import * as z from "zod";

export const GerarPrestacaoSchema = z.object({
  condominioId: z.string().min(1, { error: "Selecione o condomínio." }),
  competenciaMes: z.coerce.number().int().min(1).max(12),
  competenciaAno: z.coerce.number().int().min(2000).max(2100),
});
export type GerarPrestacaoFormValues = z.infer<typeof GerarPrestacaoSchema>;

export const AtualizarPrestacaoSchema = z.object({
  saldoAnterior: z.coerce.number({ error: "Informe um valor numérico." }),
  observacoes: z.string().trim().optional().or(z.literal("")),
});
export type AtualizarPrestacaoFormValues = z.infer<typeof AtualizarPrestacaoSchema>;

export const ReabrirPrestacaoSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(10, { error: "Descreva o motivo da reabertura (mínimo 10 caracteres) — fica registrado na auditoria." }),
});
export type ReabrirPrestacaoFormValues = z.infer<typeof ReabrirPrestacaoSchema>;
