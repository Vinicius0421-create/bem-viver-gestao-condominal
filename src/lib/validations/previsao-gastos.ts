import * as z from "zod";

// Mesmo cuidado de Select/Input opcionais já documentado em
// src/lib/validations/documento.ts e fundo-reserva.ts: um <Select> do
// Radix sempre envia string vazia (nunca omite o campo) quando nada é
// selecionado, então z.coerce sozinho converteria "" em valores errados
// (0, NaN) silenciosamente.
const vazioParaUndefined = (valor: unknown) => (valor === "" || valor === null ? undefined : valor);

export const PrevisaoGastosItemSchema = z.object({
  categoriaId: z.preprocess(vazioParaUndefined, z.string().optional()),
  tipo: z.enum(["ORDINARIA", "EXTRAORDINARIA"], { error: "Selecione o tipo da despesa." }),
  descricao: z.string().trim().min(1, { error: "Descreva a despesa." }),
  valorTotal: z.coerce.number().nonnegative({ error: "O valor não pode ser negativo." }),
  observacoes: z.string().trim().optional().or(z.literal("")),
});
export type PrevisaoGastosItemFormValues = z.infer<typeof PrevisaoGastosItemSchema>;

export const PrevisaoGastosSchema = z.object({
  condominioId: z.string().min(1, { error: "Selecione o condomínio." }),
  competenciaMes: z.coerce.number().int().min(1).max(12),
  competenciaAno: z.coerce.number().int().min(2000).max(2100),
  diaLimitePagamento: z.preprocess(
    vazioParaUndefined,
    z.coerce.number().int().min(1).max(31).optional()
  ),
  observacoes: z.string().trim().optional().or(z.literal("")),
  // Serializado como JSON pelo componente cliente (lista dinâmica de
  // linhas — não há como representar um array de objetos direto em
  // FormData sem indexação manual, e o formulário real do Drive tem um
  // número variável de linhas por competência). Validado em duas etapas:
  // primeiro é só uma string aqui, o parse+validação de cada item roda no
  // Server Action antes de qualquer escrita no banco.
  itensJson: z.string().min(1, { error: "Adicione pelo menos um item de despesa." }),
});
export type PrevisaoGastosFormValues = z.infer<typeof PrevisaoGastosSchema>;
