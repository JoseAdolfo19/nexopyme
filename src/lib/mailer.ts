import "server-only";

/**
 * Mailer transaccional con dos proveedores:
 *
 * 1. SMTP (recomendado sin dominio propio): Gmail u otro proveedor con
 *    usuario y contraseña de aplicación.
 *      - SMTP_HOST, SMTP_PORT (por defecto 587; 465 usa SSL directo)
 *      - SMTP_USER, SMTP_PASS
 *      - SMTP_FROM opcional ("Tienda Plus <correo>") — con Gmail el remitente
 *        siempre es la cuenta autenticada.
 *
 * 2. Resend (requiere dominio verificado en resend.com/domains para enviar
 *    a terceros; sin dominio solo acepta el correo del dueño de la cuenta):
 *      - RESEND_API_KEY, EMAIL_FROM
 *
 * Si no hay ningún proveedor configurado, no se envía nada: se registra en
 * consola/log con el prefijo [mailer:dev] (útil en desarrollo).
 *
 * Prioridad: SMTP > Resend, para poder usar Gmail aunque exista una key de
 * Resend restringida.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Tienda Plus <no-reply@resend.dev>";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string; contentType?: string }[];
};

const smtpConfigured = (): boolean => Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

export function isEmailDeliveryConfigured(): boolean {
  return smtpConfigured() || Boolean(RESEND_API_KEY);
}

/** Envía por SMTP con nodemailer (p. ej. Gmail con contraseña de aplicación). */
async function sendViaSmtp({ to, subject, html, text, attachments }: SendEmailInput) {
  const { default: nodemailer } = await import("nodemailer");

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER!, pass: SMTP_PASS! },
  });

  const info = await transport.sendMail({
    from: process.env.SMTP_FROM ?? SMTP_USER,
    to,
    subject,
    text,
    html,
    ...(attachments?.length
      ? {
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            encoding: "base64" as const,
            ...(a.contentType ? { contentType: a.contentType } : {}),
          })),
        }
      : {}),
  });

  return { messageId: info.messageId };
}

export async function sendEmail({ to, subject, html, text, attachments }: SendEmailInput): Promise<{ dev?: boolean } | { messageId?: string }> {
  if (smtpConfigured()) {
    return sendViaSmtp({ to, subject, html, text, attachments });
  }

  if (!RESEND_API_KEY) {
    console.log(`[mailer:dev] A ${to} — ${subject}`);
    console.log(`[mailer:dev] ${text}`);
    return { dev: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
      text,
      ...(attachments?.length ? { attachments } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }

  return res.json();
}
