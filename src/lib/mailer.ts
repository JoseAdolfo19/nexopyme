import "server-only";

/**
 * Mailer transaccional vía Resend (https://resend.com).
 *
 * Requiere:
 *  - RESEND_API_KEY: API key de Resend.
 *  - EMAIL_FROM:     remitente verificado, p.ej. "Tienda Plus <no-reply@tudominio.com>".
 *
 * Si falta RESEND_API_KEY, no se envía nada: se registra en consola/log con el
 * prefijo [mailer:dev] (útil en desarrollo).
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Tienda Plus <no-reply@resend.dev>";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string; contentType?: string }[];
};

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

export async function sendEmail({ to, subject, html, text, attachments }: SendEmailInput): Promise<{ dev?: boolean }> {
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