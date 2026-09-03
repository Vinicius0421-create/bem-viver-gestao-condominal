import "server-only";
import nodemailer from "nodemailer";

// Envio de e-mail via SMTP do Gmail, usando a própria conta que a Bem Viver
// já usa no dia a dia (bemviverassessoria.cond@gmail.com) — evita depender
// de um serviço transacional novo (Resend, SendGrid) e de um domínio próprio
// só para conseguir enviar e-mail, o que a empresa não tem hoje.
//
// Requer duas variáveis de ambiente:
//   GMAIL_USER          - o endereço Gmail remetente
//   GMAIL_APP_PASSWORD  - uma "senha de app" gerada nas configurações de
//                         segurança da conta Google (não é a senha normal
//                         da conta — é um código de 16 caracteres específico
//                         para este fim, e pode ser revogado a qualquer
//                         momento sem afetar o login normal do Gmail).
//
// Se essas variáveis não estiverem configuradas, o link de recuperação é
// apenas registrado no log do servidor (útil em desenvolvimento local) em
// vez de travar o fluxo com um erro — mas em produção isso significa que o
// e-mail não chega de fato ao usuário.
function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return "http://localhost:3000";
}

export async function enviarEmailRecuperacaoSenha(destinatario: string, nome: string, token: string) {
  const link = `${getAppUrl()}/redefinir-senha?token=${token}`;
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      "[email] GMAIL_USER/GMAIL_APP_PASSWORD não configurados — e-mail de recuperação não enviado. Link gerado:",
      link
    );
    return;
  }

  const primeiroNome = nome.split(" ")[0];

  await transporter.sendMail({
    from: `"Bem Viver Assessoria Condominial" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: "Recuperação de senha — Sistema Bem Viver",
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff;">
        <div style="background: #171310; padding: 28px 32px; text-align: center;">
          <span style="color: #d9b53f; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">Bem Viver</span>
          <div style="color: rgba(255,255,255,0.55); font-size: 12px; margin-top: 2px;">Assessoria Condominial</div>
        </div>
        <div style="padding: 32px; color: #171310;">
          <p style="font-size: 15px; line-height: 1.5;">Olá, ${primeiroNome}.</p>
          <p style="font-size: 15px; line-height: 1.5;">
            Recebemos uma solicitação para redefinir a senha da sua conta no
            Sistema de Gestão e Prestação de Contas da Bem Viver. Clique no
            botão abaixo para criar uma nova senha:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}"
               style="background: #b3892f; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: bold; display: inline-block;">
              Redefinir minha senha
            </a>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #6b6b6b;">
            Este link expira em 1 hora. Se você não solicitou essa alteração,
            pode ignorar este e-mail com segurança — sua senha atual continua
            válida.
          </p>
          <p style="font-size: 12px; line-height: 1.5; color: #9a9a9a; word-break: break-all; margin-top: 20px;">
            Se o botão não funcionar, copie e cole este link no navegador:<br />${link}
          </p>
        </div>
        <div style="padding: 16px 32px; border-top: 1px solid #eee; text-align: center;">
          <span style="font-size: 11px; color: #9a9a9a;">Bem Viver Assessoria Condominial · (37) 99911-1336</span>
        </div>
      </div>
    `,
  });
}
