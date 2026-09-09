import * as z from "zod";

// Select/Input opcionais sempre submetem string vazia quando nada é
// preenchido (ver src/lib/validations/documento.ts para o detalhe do bug do
// Radix Select). aportes/resgates/rendimento têm defaultValue no formulário,
// mas o preprocess protege contra qualquer submissão vazia mesmo assim.
const vazioParaZero = (valor: unknown) => (valor === "" || valor === null ? 0 : valor);

export const MovimentoFundoReservaSchema = z.object({
  condominioId: z.string().min(1, { error: "Selecione o condomínio." }),
  competenciaMes: z.coerce.number().int().min(1).max(12),
  competenciaAno: z.coerce.number().int().min(2000).max(2100),
  saldoInicial: z.coerce.number().nonnegative({ error: "O saldo inicial não pode ser negativo." }),
  aportes: z.preprocess(
    vazioParaZero,
    z.coerce.number().nonnegative({ error: "Aportes não podem ser negativos." })
  ),
  resgates: z.preprocess(
    vazioParaZero,
    z.coerce.number().nonnegative({ error: "Resgates não podem ser negativos." })
  ),
  // Rendimento pode ser negativo (perda em aplicação financeira) —
  // diferente de aportes/resgates, não é restrito a não-negativo.
  rendimento: z.preprocess(vazioParaZero, z.coerce.number()),
  observacoes: z.string().trim().optional().or(z.literal("")),
});
export type MovimentoFundoReservaFormValues = z.infer<typeof MovimentoFundoReservaSchema>;
