import * as z from "zod";

export const LoginSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }).trim(),
  senha: z
    .string()
    .min(1, { error: "Informe sua senha." }),
});

export type LoginState =
  | {
      error?: string;
    }
  | undefined;

export const RecuperarSenhaSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }).trim(),
});

export type RecuperarSenhaState =
  | {
      error?: string;
      success?: boolean;
    }
  | undefined;

export const RedefinirSenhaSchema = z
  .object({
    token: z.string().min(1, { error: "Link inválido." }),
    senha: z.string().min(8, { error: "A senha deve ter pelo menos 8 caracteres." }),
    confirmarSenha: z.string().min(1, { error: "Confirme a nova senha." }),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    error: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  });

export type RedefinirSenhaState =
  | {
      error?: string;
      success?: boolean;
    }
  | undefined;
