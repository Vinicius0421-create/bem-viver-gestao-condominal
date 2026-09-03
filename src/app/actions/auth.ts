"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";
import { registrarAuditoria } from "@/lib/audit";
import { enviarEmailRecuperacaoSenha } from "@/lib/email";
import {
  LoginSchema,
  type LoginState,
  RecuperarSenhaSchema,
  type RecuperarSenhaState,
  RedefinirSenhaSchema,
  type RedefinirSenhaState,
} from "@/lib/validations/auth";

// Validade do link de recuperação de senha — 1 hora é o padrão adotado pela
// maioria dos sistemas (curto o bastante para reduzir a janela de risco caso
// o e-mail seja interceptado, longo o bastante para não frustrar quem demora
// um pouco para checar a caixa de entrada).
const VALIDADE_TOKEN_MS = 60 * 60 * 1000;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });

  if (!validated.success) {
    return { error: "Preencha e-mail e senha corretamente." };
  }

  const { email, senha } = validated.data;

  const usuario = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Mensagem genérica de propósito — não revelar se o e-mail existe ou não,
  // evitando enumeração de contas por um atacante.
  const credenciaisInvalidas = { error: "E-mail ou senha inválidos." };

  if (!usuario || !usuario.ativo) {
    await registrarAuditoria({
      acao: "LOGIN_FALHOU",
      entidade: "Usuario",
      entidadeId: usuario?.id,
      dadosDepois: { email },
    });
    return credenciaisInvalidas;
  }

  const senhaOk = await verifyPassword(senha, usuario.senhaHash);
  if (!senhaOk) {
    await registrarAuditoria({
      acao: "LOGIN_FALHOU",
      entidade: "Usuario",
      entidadeId: usuario.id,
    });
    return credenciaisInvalidas;
  }

  await createSession({
    userId: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
  });

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoLoginEm: new Date() },
  });

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "LOGIN",
    entidade: "Usuario",
    entidadeId: usuario.id,
  });

  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// Solicitar recuperação de senha — sempre retorna a mesma mensagem de
// sucesso, exista ou não o e-mail cadastrado. Isso evita que alguém use este
// formulário para descobrir quais e-mails têm conta no sistema (enumeração
// de contas), o mesmo cuidado já tomado no login.
export async function solicitarRecuperacaoSenha(
  _prevState: RecuperarSenhaState,
  formData: FormData
): Promise<RecuperarSenhaState> {
  const validated = RecuperarSenhaSchema.safeParse({ email: formData.get("email") });
  if (!validated.success) {
    return { error: "Informe um e-mail válido." };
  }

  const mensagemGenerica = { success: true } as const;
  const email = validated.data.email.toLowerCase();

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.ativo) {
    return mensagemGenerica;
  }

  const token = randomBytes(32).toString("hex");
  await prisma.tokenRecuperacaoSenha.create({
    data: {
      usuarioId: usuario.id,
      token,
      expiraEm: new Date(Date.now() + VALIDADE_TOKEN_MS),
    },
  });

  await enviarEmailRecuperacaoSenha(usuario.email, usuario.nome, token);

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "ATUALIZACAO",
    entidade: "Usuario",
    entidadeId: usuario.id,
    dadosDepois: { acao: "recuperacao_de_senha_solicitada" },
  });

  return mensagemGenerica;
}

// Redefinir a senha a partir de um token válido (recebido por e-mail).
export async function redefinirSenhaComToken(
  _prevState: RedefinirSenhaState,
  formData: FormData
): Promise<RedefinirSenhaState> {
  const validated = RedefinirSenhaSchema.safeParse({
    token: formData.get("token"),
    senha: formData.get("senha"),
    confirmarSenha: formData.get("confirmarSenha"),
  });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { token, senha } = validated.data;

  const registro = await prisma.tokenRecuperacaoSenha.findUnique({ where: { token } });

  const linkInvalido = { error: "Este link é inválido ou expirou. Solicite uma nova recuperação de senha." };

  if (!registro || registro.usadoEm || registro.expiraEm < new Date()) {
    return linkInvalido;
  }

  const senhaHash = await hashPassword(senha);

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: registro.usuarioId }, data: { senhaHash } }),
    prisma.tokenRecuperacaoSenha.update({ where: { id: registro.id }, data: { usadoEm: new Date() } }),
  ]);

  await registrarAuditoria({
    usuarioId: registro.usuarioId,
    acao: "ATUALIZACAO",
    entidade: "Usuario",
    entidadeId: registro.usuarioId,
    dadosDepois: { acao: "senha_redefinida_via_recuperacao" },
  });

  return { success: true };
}
