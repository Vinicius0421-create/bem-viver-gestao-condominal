import * as z from "zod";

// Select/Input opcionais sempre submetem string vazia (não omitem o campo)
// quando nada é preenchido — o <select> nativo espelhado pelo Radix Select
// manda name="" mesmo sem seleção. z.coerce.number() converteria "" em 0,
// o que quebraria a validação (min(1)) ou, pior, gravaria competenciaAno=0
// silenciosamente. Este preprocess normaliza "" (e null) para undefined
// antes da coerção, para que optional() funcione como esperado.
const vazioParaUndefined = (valor: unknown) => (valor === "" || valor === null ? undefined : valor);

export const DocumentoSchema = z.object({
  condominioId: z.string().min(1, { error: "Selecione o condomínio." }).trim(),
  nome: z.string().min(2, { error: "Informe um nome para o documento." }).trim(),
  descricao: z.string().trim().optional().or(z.literal("")),
  categoriaId: z.string().trim().min(1, { error: "Selecione a categoria." }),
  dataValidade: z.string().trim().optional().or(z.literal("")),
  competenciaMes: z.preprocess(
    vazioParaUndefined,
    z.coerce.number().int().min(1).max(12).optional()
  ),
  competenciaAno: z.preprocess(vazioParaUndefined, z.coerce.number().int().optional()),
  fornecedorId: z.string().trim().optional().or(z.literal("")),
  unidadeId: z.string().trim().optional().or(z.literal("")),
  // Recebido como texto separado por vírgula no formulário; convertido
  // para array antes de gravar (ver actions/documentos.ts).
  tags: z.string().trim().optional().or(z.literal("")),
});
export type DocumentoFormValues = z.infer<typeof DocumentoSchema>;
